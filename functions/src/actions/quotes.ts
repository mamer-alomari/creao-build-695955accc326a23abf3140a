import { getDb } from "../lib/admin-db";
import { calculateAIQuote } from "../lib/quote-engine";

import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole } from "../types/enums";
import { QuoteModel } from "../types/models";
import {
  CreateQuoteInput,
  UpdateQuoteInput,
  UpdateQuoteStatusInput,
  CalculateAIQuoteInput,
  ListByCompanyInput,
  GetByIdInput,
} from "../types/action-types";
import {
  CreateQuoteSchema,
  UpdateQuoteSchema,
  UpdateQuoteStatusSchema,
  CalculateAIQuoteSchema,
  ListByCompanySchema,
  GetByIdSchema,
} from "../lib/validators";
import { QuoteBreakdown } from "../lib/quote-engine";

const COLLECTION = "quotes";

async function _createQuote(ctx: AuthContext, input: CreateQuoteInput): Promise<ActionResult<QuoteModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const quote: QuoteModel = {
    id: ref.id,
    create_time: now,
    update_time: now,
    pickup_address: input.pickup_address,
    dropoff_address: input.dropoff_address,
    move_date: input.move_date,
    inventory_items: input.inventory_items,
    estimated_volume: input.estimated_volume,
    estimated_price_min: input.estimated_price_min,
    estimated_price_max: input.estimated_price_max,
    customer_name: input.customer_name,
    customer_email: input.customer_email,
    customer_phone: input.customer_phone,
    status: "PENDING",
    company_id: input.company_id,
    customer_id: input.customer_id,
    stops: input.stops,
    expires_at: input.expires_at,
  };

  // Store audit-compatible data alongside the quote
  await ref.set({ ...quote, data_creator: ctx.userId, data_updater: ctx.userId });
  return ok(quote);
}

async function _getQuote(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<QuoteModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Quote not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as QuoteModel);
}

async function _updateQuote(ctx: AuthContext, input: UpdateQuoteInput): Promise<ActionResult<QuoteModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Quote not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.update_time = nowISO();
  filtered.data_updater = ctx.userId;

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as QuoteModel);
}

async function _listQuotesByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<QuoteModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .orderBy("create_time", "desc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuoteModel)));
}

async function _updateQuoteStatus(ctx: AuthContext, input: UpdateQuoteStatusInput): Promise<ActionResult<QuoteModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Quote not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  await ref.update({ status: input.status, update_time: nowISO(), data_updater: ctx.userId });
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as QuoteModel);
}

async function _calculateAIQuote(_ctx: AuthContext, input: CalculateAIQuoteInput): Promise<ActionResult<QuoteBreakdown>> {
  const breakdown = calculateAIQuote(input.rooms, input.distance, input.classification);
  return ok(breakdown);
}

const WRITE = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Worker, UserRole.Foreman, UserRole.Manager, UserRole.Admin, UserRole.Customer];

export const createQuote = withValidation(CreateQuoteSchema, withAuth(WRITE, _createQuote));
export const getQuote = withValidation(GetByIdSchema, withAuth(READ, _getQuote));
export const updateQuote = withValidation(UpdateQuoteSchema, withAuth(WRITE, _updateQuote));
export const listQuotesByCompany = withValidation(ListByCompanySchema, withAuth(READ, _listQuotesByCompany));
export const updateQuoteStatus = withValidation(UpdateQuoteStatusSchema, withAuth(WRITE, _updateQuoteStatus));
export const calculateAIQuoteAction = withValidation(CalculateAIQuoteSchema, withAuth(READ, _calculateAIQuote));
