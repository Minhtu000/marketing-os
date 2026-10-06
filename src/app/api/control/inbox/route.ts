import { NextResponse } from "next/server";
import { isHandoffEnvelope } from "@/core/handoff/envelope";
import { saveHandoff, listHandoffs } from "@/core/handoff/inbox-store";
import { evaluateActionPolicy } from "@/core/actions/action-policy";
import { createApproval, getApproval } from "@/core/actions/approval";
import { appendAuditEvent } from "@/core/actions/audit";
export async function GET() {
  try {
    const handoffs = await listHandoffs();
    return NextResponse.json({
      ok: true,
      count: handoffs.length,
      handoffs,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read handoff inbox.",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isHandoffEnvelope(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid handoff envelope.",
        },
        { status: 400 },
      );
    }
    const result = await saveHandoff(body);
    if (result.status === "conflict") {
      return NextResponse.json(
        {
          ok: false,
          error: "Handoff ID already exists with different content.",
          handoffId: body.handoffId,
        },
        { status: 409 },
      );
    }
    if (
      body.kind === "action_request" &&
      result.status === "created"
    ) {
      const payload = body.payload as Record<string, unknown>;
      const actionId =
        body.actionId ??
        (typeof payload.actionId === "string"
          ? payload.actionId
          : undefined);
      const actionType =
        typeof payload.actionType === "string"
          ? payload.actionType
          : undefined;
      if (!actionId || !actionType) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Action request requires actionId and payload.actionType.",
            handoffId: body.handoffId,
          },
          { status: 400 },
        );
      }
      const action = {
        id: actionId,
        moduleId: body.moduleId,
        type: actionType as
          | "seo.read.gsc"
          | "seo.read.ga4"
          | "seo.read.upgradeseo"
          | "seo.read.backlinks"
          | "seo.read.geolint"
          | "seo.read.trends"
          | "seo.read.gbp"
          | "seo.read.playwright"
          | "seo.write.content"
          | "seo.write.metadata"
          | "seo.human.canonical"
          | "seo.human.url"
          | "seo.human.redirect"
          | "seo.human.robots",
        input: payload,
        requestedBy: body.source,
      };
      const policy = evaluateActionPolicy(
        action.moduleId,
        action.type,
      );
      if (
        !policy.allowed &&
        policy.reason === "WRITE_REQUIRES_APPROVAL"
      ) {
        const existing = await getApproval(action.id);
        if (existing) {
          return NextResponse.json({
            ok: true,
            created: true,
            replayed: true,
            handoff: result.handoff,
            approval: {
              approvalId: existing.approvalId,
              actionId: action.id,
              status: existing.status,
            },
          });
        }
        const approval = await createApproval(action);
        const approvalResult = {
          actionId: action.id,
          status: "accepted" as const,
          message: "Action is pending approval.",
          executedAt: approval.requestedAt,
          data: {
            approvalId: approval.approvalId,
            approvalStatus: approval.status,
            handoffId: body.handoffId,
          },
        };
        await appendAuditEvent(
          action,
          "accepted",
          approvalResult,
        );
        return NextResponse.json({
          ok: true,
          created: true,
          replayed: false,
          handoff: result.handoff,
          approval: {
            approvalId: approval.approvalId,
            actionId: action.id,
            status: approval.status,
          },
        });
      }
      return NextResponse.json(
        {
          ok: false,
          error:
            policy.allowed
              ? "Action requests for read-only actions are not accepted through the approval bridge."
              : policy.message,
          reason: policy.allowed
            ? "READ_ONLY_ACTION_REQUEST_NOT_SUPPORTED"
            : policy.reason,
          handoffId: body.handoffId,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      created: result.status === "created",
      replayed: result.status === "replayed",
      handoff: result.handoff,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to ingest handoff.",
      },
      { status: 400 },
    );
  }
}
