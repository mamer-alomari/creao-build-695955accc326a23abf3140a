import { UserRole } from "../types/enums";
import { getAuth, getDb } from "./admin-db";

export interface AuthContext {
  userId: string;
  userRole: UserRole;
  companyId: string | null;
}

export async function authContextFromToken(idToken: string): Promise<AuthContext> {
  const decoded = await getAuth().verifyIdToken(idToken);
  const uid = decoded.uid;

  const db = getDb();

  // Look up by document ID (the ORM stores workers with doc ID = worker id)
  const workerDoc = await db.collection("workers").doc(uid).get();
  if (workerDoc.exists) {
    const worker = workerDoc.data()!;
    return {
      userId: uid,
      userRole: (worker.role as UserRole) || UserRole.Unspecified,
      companyId: worker.company_id || null,
    };
  }

  // Fallback: query by `id` field in case doc ID != uid
  const workerSnap = await db.collection("workers")
    .where("id", "==", uid)
    .limit(1)
    .get();

  if (!workerSnap.empty) {
    const worker = workerSnap.docs[0].data();
    return {
      userId: uid,
      userRole: (worker.role as UserRole) || UserRole.Unspecified,
      companyId: worker.company_id || null,
    };
  }

  return {
    userId: uid,
    userRole: UserRole.Customer,
    companyId: null,
  };
}

export function serviceAccountContext(companyId: string): AuthContext {
  return {
    userId: "service-account",
    userRole: UserRole.Admin,
    companyId,
  };
}
