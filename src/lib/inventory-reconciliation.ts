import type { JobStop } from "@/sdk/database/orm/orm_job";

export interface ReconciliationItem {
  name: string;
  category?: string;
  quantity: number;
  damageDetected?: boolean;
  conditionNotes?: string;
  confidenceScore?: number;
}

export interface ReconciliationEntry {
  item: ReconciliationItem;
  loadedAtStop?: string;
  unloadedAtStop?: string;
  quantityLoaded: number;
  quantityUnloaded: number;
  discrepancy?: string;
}

export interface ReconciliationResult {
  matched: ReconciliationEntry[];
  missing: ReconciliationEntry[];
  damaged: ReconciliationEntry[];
  extra: ReconciliationEntry[];
  summary: {
    totalLoaded: number;
    totalUnloaded: number;
    missingCount: number;
    damagedCount: number;
  };
}

function itemKey(item: ReconciliationItem): string {
  return `${(item.name || "").toLowerCase().trim()}::${(item.category || "other").toLowerCase().trim()}`;
}

/**
 * Reconciles loaded items against unloaded items, flagging discrepancies.
 */
export function reconcileInventory(
  loadedItems: ReconciliationItem[],
  unloadedItems: ReconciliationItem[]
): ReconciliationResult {
  const loadedMap = new Map<string, { item: ReconciliationItem; totalQty: number }>();
  const unloadedMap = new Map<string, { item: ReconciliationItem; totalQty: number }>();

  for (const item of loadedItems) {
    const key = itemKey(item);
    const existing = loadedMap.get(key);
    if (existing) {
      existing.totalQty += item.quantity;
    } else {
      loadedMap.set(key, { item, totalQty: item.quantity });
    }
  }

  for (const item of unloadedItems) {
    const key = itemKey(item);
    const existing = unloadedMap.get(key);
    if (existing) {
      existing.totalQty += item.quantity;
    } else {
      unloadedMap.set(key, { item, totalQty: item.quantity });
    }
  }

  const matched: ReconciliationEntry[] = [];
  const missing: ReconciliationEntry[] = [];
  const damaged: ReconciliationEntry[] = [];
  const extra: ReconciliationEntry[] = [];

  // Check all loaded items against unloaded
  for (const [key, loaded] of loadedMap) {
    const unloaded = unloadedMap.get(key);
    const qtyUnloaded = unloaded?.totalQty ?? 0;

    const entry: ReconciliationEntry = {
      item: loaded.item,
      quantityLoaded: loaded.totalQty,
      quantityUnloaded: qtyUnloaded,
    };

    // Check for new damage
    const wasDamaged = loaded.item.damageDetected;
    const nowDamaged = unloaded?.item.damageDetected;

    if (nowDamaged && !wasDamaged) {
      entry.discrepancy = "New damage detected at unloading";
      entry.item = { ...entry.item, conditionNotes: unloaded?.item.conditionNotes };
      damaged.push(entry);
    } else if (qtyUnloaded < loaded.totalQty) {
      entry.discrepancy = `Missing ${loaded.totalQty - qtyUnloaded} of ${loaded.totalQty}`;
      missing.push(entry);
    } else if (qtyUnloaded === loaded.totalQty) {
      matched.push(entry);
    } else {
      // More unloaded than loaded — partial match + extra
      matched.push({ ...entry, quantityUnloaded: loaded.totalQty });
    }

    unloadedMap.delete(key);
  }

  // Remaining unloaded items not in loaded = extra
  for (const [, unloaded] of unloadedMap) {
    extra.push({
      item: unloaded.item,
      quantityLoaded: 0,
      quantityUnloaded: unloaded.totalQty,
      discrepancy: "Item found at unloading but not in loading inventory",
    });
  }

  return {
    matched,
    missing,
    damaged,
    extra,
    summary: {
      totalLoaded: loadedItems.reduce((s, i) => s + i.quantity, 0),
      totalUnloaded: unloadedItems.reduce((s, i) => s + i.quantity, 0),
      missingCount: missing.length,
      damagedCount: damaged.length,
    },
  };
}

/**
 * Aggregates all inventory_loaded JSON from pickup/storage stops.
 */
export function getAggregateLoadedItems(stops: JobStop[]): ReconciliationItem[] {
  const items: ReconciliationItem[] = [];
  for (const stop of stops) {
    if ((stop.type === "pickup" || stop.type === "storage") && stop.inventory_loaded) {
      try {
        const parsed = JSON.parse(stop.inventory_loaded);
        if (Array.isArray(parsed)) {
          items.push(...parsed);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
  return items;
}

/**
 * Aggregates all inventory_unloaded JSON from dropoff stops.
 */
export function getAggregateUnloadedItems(stops: JobStop[]): ReconciliationItem[] {
  const items: ReconciliationItem[] = [];
  for (const stop of stops) {
    if (stop.type === "dropoff" && stop.inventory_unloaded) {
      try {
        const parsed = JSON.parse(stop.inventory_unloaded);
        if (Array.isArray(parsed)) {
          items.push(...parsed);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
  return items;
}
