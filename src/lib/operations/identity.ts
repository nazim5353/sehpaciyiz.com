import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import {
  operationsDB,
  type OperationsDB,
  type OperationsTransaction,
} from "./database";
import { todayInIstanbul, type Operator } from "./types";
import {
  companyPreviewAllowed,
  PREVIEW_OWNER_EMAIL,
  PREVIEW_PASSWORD_DISABLED,
} from "./preview-access";

const scrypt = promisify(scryptCallback);
export const OPS_COOKIE = "sehpa_company";
const SESSION_SECONDS = 8 * 60 * 60;
const emailSchema = z
  .email()
  .max(200)
  .transform((value) => value.toLowerCase());
export const identityInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z.string().min(12, "Şifre en az 12 karakter olmalı.").max(128),
  })
  .strict();
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  active: boolean;
  password_hash: string;
};
const publicUser = (row: UserRow): Operator => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  active: row.active,
});
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [algorithm, salt, hex] = stored.split(":");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hex ?? "")
  )
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
export async function hasCompanyOwner(db?: OperationsDB) {
  const connection = db ?? (await operationsDB());
  return (
    (
      await connection.query(
        "SELECT id FROM ops_users WHERE role='OWNER' AND NOT(email=$1 AND password_hash=$2) LIMIT 1",
        [PREVIEW_OWNER_EMAIL, PREVIEW_PASSWORD_DISABLED],
      )
    ).rows.length > 0
  );
}
export async function auditOperation(
  tx: OperationsTransaction,
  actor: Operator,
  action: string,
  recordId: string | null,
  detail: string,
  before?: unknown,
  after?: unknown,
) {
  await tx.query(
    "INSERT INTO ops_audit(id,actor_id,action,record_id,detail,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)",
    [
      randomUUID(),
      actor.id,
      action,
      recordId,
      detail,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ],
  );
}
export function ownerOnly(actor: Operator) {
  if (!actor.active || actor.role !== "OWNER")
    throw new Error("Bu işlem yalnızca şirket sahibine açık.");
}
export async function bootstrapOwner(db: OperationsDB, input: unknown) {
  const data = identityInput.parse(input);
  const hashed = await passwordHash(data.password);
  return db.transaction(async (tx) => {
    const existing = (
      await tx.query<UserRow>(
        "SELECT * FROM ops_users WHERE role='OWNER' FOR UPDATE",
      )
    ).rows[0];
    if (existing) {
      if (
        existing.email !== PREVIEW_OWNER_EMAIL ||
        existing.password_hash !== PREVIEW_PASSWORD_DISABLED
      )
        throw new Error("İlk kurulum zaten tamamlanmış.");
      await tx.query(
        "UPDATE ops_users SET name=$2,email=$3,password_hash=$4 WHERE id=$1",
        [existing.id, data.name, data.email, hashed],
      );
      const user: Operator = {
        id: existing.id,
        name: data.name,
        email: data.email,
        role: "OWNER",
        active: true,
      };
      await auditOperation(
        tx,
        user,
        "SETUP",
        null,
        "Yerel çalışma hesabı kişisel şirket sahibi hesabına dönüştürüldü; kayıtlar korundu.",
      );
      return user;
    }
    const user: Operator = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      role: "OWNER",
      active: true,
    };
    await tx.query(
      "INSERT INTO ops_users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'OWNER')",
      [user.id, user.name, user.email, hashed],
    );
    await tx.query(
      "INSERT INTO ops_accounts(id,name,type,opening_minor,opening_date,created_by) VALUES($1,'Nakit kasa','CASH',0,$2,$3)",
      [randomUUID(), "2000-01-01", user.id],
    );
    await auditOperation(
      tx,
      user,
      "SETUP",
      null,
      "Şirket sahibi hesabı ve başlangıç kasası oluşturuldu.",
    );
    return user;
  });
}
export async function localPreviewOperator(
  db: OperationsDB,
): Promise<Operator> {
  return db.transaction(async (tx) => {
    let row = (
      await tx.query<UserRow>(
        "SELECT id,name,email,role,active FROM ops_users WHERE role='OWNER' LIMIT 1",
      )
    ).rows[0];
    if (!row) {
      const id = randomUUID();
      await tx.query(
        "INSERT INTO ops_users(id,name,email,password_hash,role) VALUES($1,'Sehpacıyız',$2,$3,'OWNER') ON CONFLICT DO NOTHING",
        [id, PREVIEW_OWNER_EMAIL, PREVIEW_PASSWORD_DISABLED],
      );
      row = (
        await tx.query<UserRow>(
          "SELECT id,name,email,role,active FROM ops_users WHERE role='OWNER' LIMIT 1",
        )
      ).rows[0];
      await tx.query(
        "INSERT INTO ops_accounts(id,name,type,opening_minor,opening_date,created_by) VALUES($1,'Nakit kasa','CASH',0,'2000-01-01',$2) ON CONFLICT(name) DO NOTHING",
        [randomUUID(), row.id],
      );
      await auditOperation(
        tx,
        publicUser(row),
        "LOCAL_PREVIEW",
        null,
        "Girişsiz yerel çalışma alanı açıldı.",
      );
    }
    if (!row.active) throw new Error("Şirket sahibi hesabı etkin değil.");
    return { ...publicUser(row), preview: true };
  });
}
export async function authenticateOperator(
  db: OperationsDB,
  email: string,
  password: string,
) {
  const normalized = email.trim().toLowerCase();
  const key = digest(normalized);
  const attempt = (
    await db.query<{ attempts: number; until_at: Date }>(
      "SELECT attempts,until_at FROM ops_login_attempts WHERE key=$1",
      [key],
    )
  ).rows[0];
  if (
    attempt &&
    attempt.attempts >= 5 &&
    new Date(attempt.until_at).getTime() > Date.now()
  )
    throw new Error(
      "Çok sayıda giriş denemesi yapıldı. 15 dakika sonra tekrar deneyin.",
    );
  const row = (
    await db.query<UserRow>(
      "SELECT id,name,email,role,active,password_hash FROM ops_users WHERE email=$1",
      [normalized],
    )
  ).rows[0];
  const hash =
    row?.password_hash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
  const valid = await passwordMatches(password, hash);
  if (!row || !row.active || !valid) {
    await db.query(
      "INSERT INTO ops_login_attempts(key,attempts,until_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN ops_login_attempts.until_at<now() THEN 1 ELSE ops_login_attempts.attempts+1 END,until_at=CASE WHEN ops_login_attempts.until_at<now() THEN now()+interval '15 minutes' ELSE ops_login_attempts.until_at END",
      [key],
    );
    throw new Error("E-posta veya şifre doğrulanamadı.");
  }
  await db.query("UPDATE ops_login_attempts SET attempts=0 WHERE key=$1", [
    key,
  ]);
  return publicUser(row);
}
export async function startOperatorSession(db: OperationsDB, user: Operator) {
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO ops_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
      [
        digest(token),
        user.id,
        new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
      ],
    );
    await auditOperation(tx, user, "LOGIN", null, "Oturum açıldı.");
  });
  return token;
}
export async function sessionOperator(db: OperationsDB, token?: string) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = (
    await db.query<UserRow>(
      "SELECT u.id,u.name,u.email,u.role,u.active FROM ops_sessions s JOIN ops_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true",
      [digest(token)],
    )
  ).rows[0];
  return row ? publicUser(row) : null;
}
export async function currentOperator() {
  if (companyPreviewAllowed((await headers()).get("host")))
    return localPreviewOperator(await operationsDB());
  const token = (await cookies()).get(OPS_COOKIE)?.value;
  if (!token) return null;
  return sessionOperator(await operationsDB(), token);
}
export async function setOperatorCookie(token: string) {
  (await cookies()).set(OPS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}
export async function revokeOperatorSession() {
  const jar = await cookies(),
    token = jar.get(OPS_COOKIE)?.value;
  if (token)
    await (
      await operationsDB()
    ).query("UPDATE ops_sessions SET revoked_at=now() WHERE token_hash=$1", [
      digest(token),
    ]);
  jar.delete(OPS_COOKIE);
  jar.delete("sehpa_admin");
}
export async function addStaff(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
) {
  ownerOnly(actor);
  const data = identityInput.parse(input),
    hashed = await passwordHash(data.password);
  return db.transaction(async (tx) => {
    if (
      (await tx.query("SELECT id FROM ops_users WHERE email=$1", [data.email]))
        .rows.length
    )
      throw new Error("Bu e-posta zaten kayıtlı.");
    const id = randomUUID();
    await tx.query(
      "INSERT INTO ops_users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'STAFF')",
      [id, data.name, data.email, hashed],
    );
    await auditOperation(
      tx,
      actor,
      "STAFF_CREATED",
      null,
      `${data.name} için personel hesabı oluşturuldu.`,
    );
    return id;
  });
}
export async function setStaffActive(
  db: OperationsDB,
  actor: Operator,
  id: string,
  active: boolean,
) {
  ownerOnly(actor);
  return db.transaction(async (tx) => {
    const row = (
      await tx.query<UserRow>(
        "SELECT id,name,role FROM ops_users WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!row || row.role !== "STAFF")
      throw new Error("Bu personel hesabı değiştirilemez.");
    await tx.query("UPDATE ops_users SET active=$2 WHERE id=$1", [id, active]);
    if (!active)
      await tx.query(
        "UPDATE ops_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [id],
      );
    await auditOperation(
      tx,
      actor,
      "STAFF_STATUS",
      null,
      `${row.name}: ${active ? "hesap açıldı" : "hesap kapatıldı"}.`,
    );
  });
}
export async function changeOperatorPassword(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
) {
  const data = z
    .object({
      targetId: z.uuid().optional(),
      currentPassword: z.string().max(128).optional(),
      newPassword: z.string().min(12).max(128),
    })
    .strict()
    .parse(input);
  const target = data.targetId ?? actor.id;
  const row = (
    await db.query<UserRow>(
      "SELECT id,name,email,role,active,password_hash FROM ops_users WHERE id=$1",
      [target],
    )
  ).rows[0];
  if (!row) throw new Error("Hesap bulunamadı.");
  if (target !== actor.id) {
    ownerOnly(actor);
    if (row.role !== "STAFF")
      throw new Error("Bu hesabın şifresi değiştirilemez.");
  } else if (
    !data.currentPassword ||
    !(await passwordMatches(data.currentPassword, row.password_hash))
  )
    throw new Error("Mevcut şifre doğrulanamadı.");
  const hashed = await passwordHash(data.newPassword);
  await db.transaction(async (tx) => {
    await tx.query("UPDATE ops_users SET password_hash=$2 WHERE id=$1", [
      target,
      hashed,
    ]);
    await tx.query(
      "UPDATE ops_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [target],
    );
    await auditOperation(
      tx,
      actor,
      "PASSWORD_CHANGED",
      null,
      `${row.name} hesabının şifresi değiştirildi; oturumları kapatıldı.`,
    );
  });
  return target === actor.id;
}
