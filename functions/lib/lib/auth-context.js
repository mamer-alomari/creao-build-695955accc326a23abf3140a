"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authContextFromToken = authContextFromToken;
exports.serviceAccountContext = serviceAccountContext;
const enums_1 = require("../types/enums");
const admin_db_1 = require("./admin-db");
async function authContextFromToken(idToken) {
    const decoded = await (0, admin_db_1.getAuth)().verifyIdToken(idToken);
    const uid = decoded.uid;
    const db = (0, admin_db_1.getDb)();
    const workerSnap = await db.collection("workers").where("id", "==", uid).limit(1).get();
    if (!workerSnap.empty) {
        const worker = workerSnap.docs[0].data();
        return {
            userId: uid,
            userRole: worker.role || enums_1.WorkerRole.Unspecified,
            companyId: worker.company_id || null,
        };
    }
    return {
        userId: uid,
        userRole: enums_1.WorkerRole.Customer,
        companyId: null,
    };
}
function serviceAccountContext(companyId) {
    return {
        userId: "service-account",
        userRole: enums_1.WorkerRole.Admin,
        companyId,
    };
}
//# sourceMappingURL=auth-context.js.map