import {
  collections,
  emptyState,
  ensureIdentity,
  type CloudState,
  type Identity,
} from "./model";
type Statement = { bind: (...values: unknown[]) => Statement };
export type CloudDB = {
  prepare: (sql: string) => Statement;
  batch: <T = Record<string, unknown>>(
    queries: Statement[],
  ) => Promise<{ results: T[]; success: boolean }[]>;
};
type Stored = { kind: string; id: string; payload: string; revision?: number };
export function encodeState(state: CloudState) {
  const rows = new Map<string, Stored>();
  for (const kind of collections)
    for (const item of state[kind])
      rows.set(`${kind}:${item.id}`, {
        kind,
        id: item.id,
        payload: JSON.stringify(item),
      });
  rows.set("meta:sequence", {
    kind: "meta",
    id: "sequence",
    payload: JSON.stringify({ nextNumber: state.nextNumber }),
  });
  return rows;
}
export async function loadState(db: CloudDB) {
  const batch = await db.batch<Stored>([
    db.prepare(
      "INSERT OR IGNORE INTO cloud_revision(id,revision) VALUES('company',0)",
    ),
    db.prepare("SELECT revision FROM cloud_revision WHERE id='company'"),
    db.prepare(
      "SELECT kind,id,payload FROM cloud_entities WHERE company_id='company'",
    ),
  ]);
  const state = emptyState();
  for (const row of batch[2].results) {
    if (row.kind === "meta")
      state.nextNumber = JSON.parse(row.payload).nextNumber;
    else if (collections.includes(row.kind as any))
      (state[row.kind as (typeof collections)[number]] as any[]).push(
        JSON.parse(row.payload),
      );
  }
  return { state, revision: Number(batch[1].results[0].revision) };
}
export async function commitState(
  db: CloudDB,
  revision: number,
  before: CloudState,
  after: CloudState,
) {
  const old = encodeState(before),
    next = encodeState(after),
    changes = [...next].filter(
      ([key, row]) => old.get(key)?.payload !== row.payload,
    );
  for (const [key, row] of old) {
    if (!next.has(key)) throw new Error("Kayıtlar doğrudan silinemez.");
    if (
      ["payments", "transfers", "audit", "requests"].includes(row.kind) &&
      next.get(key)?.payload !== row.payload
    )
      throw new Error("Geçmiş hareketler değiştirilemez.");
  }
  if (!changes.length) return;
  if (changes.length > 95)
    throw new Error("Tek işlemde çok fazla kayıt değişikliği var.");
  await db.batch([
    db
      .prepare(
        "UPDATE cloud_revision SET revision=CASE WHEN revision=? THEN revision+1 ELSE -1 END WHERE id='company'",
      )
      .bind(revision),
    ...changes.map(([, row]) =>
      db
        .prepare(
          "INSERT INTO cloud_entities(company_id,kind,id,payload) VALUES('company',?,?,?) ON CONFLICT(company_id,kind,id) DO UPDATE SET payload=excluded.payload",
        )
        .bind(row.kind, row.id, row.payload),
    ),
  ]);
}
export async function withCompany<T>(
  db: CloudDB,
  identity: Identity,
  change: (
    state: CloudState,
    actor: ReturnType<typeof ensureIdentity>["actor"],
  ) => Promise<T> | T,
  write = false,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await loadState(db),
      before = structuredClone(snapshot.state),
      { actor, changed } = ensureIdentity(snapshot.state, identity);
    const result = await change(snapshot.state, actor);
    if (write || changed) {
      try {
        await commitState(db, snapshot.revision, before, snapshot.state);
      } catch (e) {
        if (
          /CHECK constraint failed|revision_conflict/.test(String(e)) &&
          attempt < 4
        )
          continue;
        throw e;
      }
    }
    return result;
  }
  throw new Error("Eşzamanlı işlem var. Sayfayı yenileyip tekrar deneyin.");
}
