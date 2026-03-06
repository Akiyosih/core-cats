import { createMintSession, readMintSession } from "../../../../../lib/server/corepass-mint-sessions.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const quantity = Number(body?.quantity || 0);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      return Response.json({ error: "quantity must be 1, 2, or 3" }, { status: 400 });
    }

    const session = await createMintSession(request, { quantity });
    return Response.json(session);
  } catch (error) {
    return Response.json(
      {
        error: "failed to create corepass mint session",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = String(searchParams.get("sessionId") || "").trim();
    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = readMintSession(sessionId);
    return Response.json(session);
  } catch (error) {
    const status = error.code === "session_not_found" ? 404 : 500;
    return Response.json(
      {
        error: error.code || "failed to read mint session",
        detail: error.message,
      },
      { status },
    );
  }
}
