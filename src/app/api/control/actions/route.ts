import { NextResponse } from "next/server";
import { evaluateActionPolicy } from "@/core/actions/action-policy";
import {
  getApproval,
  createApproval,
} from "@/core/actions/approval";
import {
  getIdempotencyRecord,
  saveIdempotencyRecord,
} from "@/core/actions/idempotency";
import { appendAuditEvent } from "@/core/actions/audit";
import { executeControlAction } from "@/core/data";
import type { ControlAction } from "@/core/data/provider";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ControlAction>;
    if (!body.id || !body.moduleId || !body.type) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required action fields: id, moduleId, type.",
        },
        { status: 400 },
      );
    }
    const action: ControlAction = {
      id: body.id,
      moduleId: body.moduleId,
      type: body.type,
      
      project: body.project,input: body.input,
      requestedBy: body.requestedBy,
    };
    const policy = evaluateActionPolicy(
      action.moduleId,
      action.type,
    );
    if (!policy.allowed) {
      if (policy.reason === "WRITE_REQUIRES_APPROVAL") {
        const existing = await getApproval(action.id);
        if (existing) {
          return NextResponse.json({
            ok: true,
            result: {
              actionId: action.id,
              status:
                existing.status === "completed"
                  ? "completed"
                  : "accepted",
              message:
                existing.status === "pending"
                  ? "Action is pending approval."
                  : existing.result?.message ??
                    `Approval status: ${existing.status}.`,
              executedAt:
                existing.result?.executedAt ??
                existing.decidedAt ??
                existing.requestedAt,
              data: {
                approvalId: existing.approvalId,
                approvalStatus: existing.status,
              },
            },
          });
        }
        const approval = await createApproval(action);
        const result = {
          actionId: action.id,
          status: "accepted" as const,
          message: "Action is pending approval.",
          executedAt: approval.requestedAt,
          data: {
            approvalId: approval.approvalId,
            approvalStatus: approval.status,
          },
        };
        await appendAuditEvent(action, "accepted", result);
        return NextResponse.json({
          ok: true,
          result,
        });
      }
      const result = {
        actionId: action.id,
        status: "blocked" as const,
        message: policy.message,
        reason: policy.reason,
        executedAt: new Date().toISOString(),
      };
      const idempotency = await getIdempotencyRecord(action);
      if (idempotency.kind === "replay") {
        await appendAuditEvent(
          action,
          "replayed",
          idempotency.result,
        );
        return NextResponse.json({
          ok: true,
          result: idempotency.result,
        });
      }
      if (idempotency.kind === "conflict") {
        await appendAuditEvent(
          action,
          "conflict",
          idempotency.result,
        );
        return NextResponse.json(
          {
            ok: false,
            result: idempotency.result,
          },
          { status: 409 },
        );
      }
      await saveIdempotencyRecord(
        action,
        idempotency.fingerprint,
        result,
      );
      await appendAuditEvent(action, "blocked", result);
      return NextResponse.json({
        ok: true,
        result,
      });
    }
    const idempotency = await getIdempotencyRecord(action);
    if (idempotency.kind === "replay") {
      await appendAuditEvent(
        action,
        "replayed",
        idempotency.result,
      );
      return NextResponse.json({
        ok: true,
        result: idempotency.result,
      });
    }
    if (idempotency.kind === "conflict") {
      await appendAuditEvent(
        action,
        "conflict",
        idempotency.result,
      );
      return NextResponse.json(
        {
          ok: false,
          result: idempotency.result,
        },
        { status: 409 },
      );
    }
    const result = await executeControlAction(action);
    await saveIdempotencyRecord(
      action,
      idempotency.fingerprint,
      result,
    );
    const auditEvent =
      result.status === "failed"
        ? "failed"
        : result.status === "completed"
          ? "completed"
          : "blocked";
    await appendAuditEvent(
      action,
      auditEvent,
      result,
    );
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("[control/actions] failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to execute control action.",
      },
      { status: 500 },
    );
  }
}

