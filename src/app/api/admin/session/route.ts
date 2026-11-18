import { assertOrigin, requestOrigin } from "@/lib/auth";
import { revokeOperatorSession } from "@/lib/operations/identity";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const data = await request.formData();
    if (data.get("action") === "logout") {
      await revokeOperatorSession();
      return Response.redirect(
        new URL("/yonetim/giris", requestOrigin(request)),
        303,
      );
    }
    return Response.redirect(
      new URL("/yonetim/giris", requestOrigin(request)),
      303,
    );
  } catch {
    return Response.json({ error: "Oturum açılamadı." }, { status: 403 });
  }
}
