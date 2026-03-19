"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.get = get;
exports.create = create;
exports.update = update;
exports.remove = remove;
const actions = __importStar(require("../../actions"));
function print(result) {
    console.log(JSON.stringify(result, null, 2));
}
async function list(ctx, flags) {
    print(await actions.listVehiclesByCompany(ctx, { company_id: flags.company_id || ctx.companyId }));
}
async function get(ctx, flags) {
    print(await actions.getVehicle(ctx, { id: flags.id }));
}
async function create(ctx, flags) {
    print(await actions.createVehicle(ctx, {
        company_id: flags.company_id || ctx.companyId,
        vehicle_name: flags.vehicle_name,
        license_plate: flags.license_plate,
        type: Number(flags.type) || 0,
        capacity_cft: flags.capacity_cft ? Number(flags.capacity_cft) : undefined,
    }));
}
async function update(ctx, flags) {
    const { id } = flags, rest = __rest(flags, ["id"]);
    const input = { id };
    if (rest.vehicle_name)
        input.vehicle_name = rest.vehicle_name;
    if (rest.license_plate)
        input.license_plate = rest.license_plate;
    if (rest.type)
        input.type = Number(rest.type);
    if (rest.capacity_cft)
        input.capacity_cft = Number(rest.capacity_cft);
    print(await actions.updateVehicle(ctx, input));
}
async function remove(ctx, flags) {
    print(await actions.deleteVehicle(ctx, { id: flags.id }));
}
//# sourceMappingURL=vehicles.js.map