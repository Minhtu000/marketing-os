import { NextResponse } from "next/server";
import { evaluateActionPolicy } from "@/core/actions/action-policy";
import {
  getApproval,
  updateApproval,
} from "@/core/actions/approval";
import {
  getIdempotencyRecord,
  saveIdempotencyRecord,
} from "@/core/actions/idempotency";
import { appendAuditEvent } from "@/core/actions/audit";
import { executeControlAction } from "@/core/data";
import { getProjectExecutionProfile } from "@/core/execution/project-profiles";
import { writeApprovedAction } from "@/core/bridge/approved-action-writer";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      actionId?: string;
      decision?: "approve" | "reject";
      decidedBy?: string;
    };
    if (!body.actionId || !body.decision || !body.decidedBy) {
      return NextResponse.json(
        {
          ok: false,
          error: "Required fields: actionId, decision, decidedBy.",
        },
        { status: 400 },
      );
    }
    const approval = await getApproval(body.actionId);
    if (!approval) {
      return NextResponse.json(
        {
          ok: false,
          error: "Approval request not found.",
        },
        { status: 404 },
      );
    }
    if (approval.status !== "pending") {
      if (body.decision === "approve" && approval.result) {
        await appendAuditEvent(
          approval.action,
          "replayed",
          approval.result,
        );
      }
      return NextResponse.json({
        ok: true,
        result: approval.result ?? {
          actionId: approval.action.id,
          status:
            approval.status === "completed"
              ? "completed"
              : "blocked",
          message: `Approval is already ${approval.status}.`,
          executedAt:
            approval.decidedAt ??
            approval.requestedAt,
        },
      });
    }
    const policy = evaluateActionPolicy(
      approval.action.moduleId,
      approval.action.type,
    );
    if (
      !policy.allowed &&
      policy.reason !== "WRITE_REQUIRES_APPROVAL"
    ) {
      const result = {
        actionId: approval.action.id,
        status: "blocked" as const,
        message: policy.message,
        executedAt: new Date().toISOString(),
        data: {
          approvalId: approval.approvalId,
          policyReason: policy.reason,
          decidedBy: body.decidedBy,
        },
      };
      await updateApproval(
        approval.action.id,
        {
          status: "rejected",
          decidedAt: result.executedAt,
          decidedBy: body.decidedBy,
          result,
        },
      );
      await appendAuditEvent(
        approval.action,
        "blocked",
        result,
      );
      return NextResponse.json({
        ok: true,
        result,
      });
    }
    if (body.decision === "reject") {
      const result = {
        actionId: approval.action.id,
        status: "blocked" as const,
        message: "Action rejected by human approver.",
        executedAt: new Date().toISOString(),
        data: {
          approvalId: approval.approvalId,
          approvalStatus: "rejected",
          decidedBy: body.decidedBy,
        },
      };
      await updateApproval(
        approval.action.id,
        {
          status: "rejected",
          decidedAt: result.executedAt,
          decidedBy: body.decidedBy,
          result,
        },
      );
      await appendAuditEvent(
        approval.action,
        "blocked",
        result,
      );
      return NextResponse.json({
        ok: true,
        result,
      });
    }
    const idempotency = await getIdempotencyRecord(
      approval.action,
    );
    if (idempotency.kind === "replay") {
      await updateApproval(
        approval.action.id,
        {
          status: "completed",
          decidedAt: new Date().toISOString(),
          decidedBy: body.decidedBy,
          result: idempotency.result,
        },
      );
      await appendAuditEvent(
        approval.action,
        "replayed",
        idempotency.result,
      );
      return NextResponse.json({
        ok: true,
        result: idempotency.result,
      });
    }
    if (idempotency.kind === "conflict") {
      return NextResponse.json(
        {
          ok: false,
          result: idempotency.result,
        },
        { status: 409 },
      );
    }
    let result: Awaited<ReturnType<typeof executeControlAction>>;
    if (
      approval.action.type === "seo.write.metadata" ||
      approval.action.type === "seo.write.content"
    ) {
      const project =
        typeof approval.action.project === "string"
          ? approval.action.project
          : null;
      const profile = project
        ? getProjectExecutionProfile(project)
        : null;
      if (
        profile &&
        profile.enabled &&
        profile.adapter === "playwright"
      ) {
        try {
          const envelope = await writeApprovedAction(
            approval.action,
            profile,
            approval.approvalId,
            body.decidedBy,
            new Date().toISOString(),
          );
          result = {
            actionId: approval.action.id,
            status: "accepted",
            message:
              "Action approved and queued for the Claude Playwright bridge. No CMS action was executed by Marketing OS.",
            executedAt: new Date().toISOString(),
            data: {
              approvalId: approval.approvalId,
              bridgeActionId: envelope.action_id,
              bridgeAdapter: envelope.adapter,
              bridgeStatus: "approved",
            },
          };
        } catch (error) {
          result = {
            actionId: approval.action.id,
            status: "blocked",
            message:
              error instanceof Error
                ? error.message
                : "Failed to queue approved action for the Claude Playwright bridge.",
            executedAt: new Date().toISOString(),
            data: {
              approvalId: approval.approvalId,
              bridgeStatus: "blocked",
            },
          };
        }
      } else {
        result = await executeControlAction(
          approval.action,
        );
      }
    } else {
      result = await executeControlAction(
        approval.action,
      );
    }
    await saveIdempotencyRecord(
      approval.action,
      idempotency.fingerprint,
      result,
    );
    await updateApproval(
      approval.action.id,
      {
        status:
          result.status === "completed"
            ? "completed"
            : "approved",
        decidedAt: new Date().toISOString(),
        decidedBy: body.decidedBy,
        result,
      },
    );
    const auditEvent =
  result.status === "accepted"
    ? "accepted"
    : result.status === "failed"
      ? "failed"
      : result.status === "completed"
        ? "completed"
        : "blocked";
    await appendAuditEvent(
      approval.action,
      auditEvent,
      result,
    );
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process approval.",
          detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
