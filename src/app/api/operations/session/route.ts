import { z } from "zod";
import { assertOrigin, isLocalPreview } from "@/lib/auth";
import { operationsDB } from "@/lib/operations/database";
import {
  authenticateOperator,
  bootstrapOwner,
  revokeOperatorSession,
  setOperatorCookie,
  startOperatorSession,
} from "@/lib/operations/identity";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 8192)
      return Response.json({ error: "İstek çok büyük." }, { status: 413 });
    const body = JSON.parse(text);
    if (body.action === "logout") {
      await revokeOperatorSession();
      return Response.json({ ok: true });
    }
    const db = await operationsDB();
    let user;
    if (body.action === "setup") {
      if (!isLocalPreview(request))
        return Response.json(
          {
            error:
              "İlk şirket sahibi hesabını bu bilgisayarda 127.0.0.1 adresinden oluşturun.",
          },
          { status: 403 },
        );
      user = await bootstrapOwner(db, body.user);
    } else if (body.action === "login") {
      const data = z
        .object({
          email: z.email().max(200),
          password: z.string().min(1).max(128),
        })
        .strict()
        .parse(body.user);
      user = await authenticateOperator(db, data.email, data.password);
    } else return Response.json({ error: "İşlem tanınmadı." }, { status: 400 });
    const token = await startOperatorSession(db, user);
    await setOperatorCookie(token);
    return Response.json({
      ok: true,
      user: { name: user.name, role: user.role },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message
            : error instanceof Error
              ? error.message
              : "Oturum açılamadı.",
      },
      { status: 400 },
    );
  }
}
