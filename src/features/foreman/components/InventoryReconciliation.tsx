import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import {
  reconcileInventory,
  getAggregateLoadedItems,
  getAggregateUnloadedItems,
  type ReconciliationResult,
  type ReconciliationEntry,
} from "@/lib/inventory-reconciliation";
import type { JobStop } from "@/sdk/database/orm/orm_job";

interface InventoryReconciliationProps {
  stops: JobStop[];
  onConfirm: (notes: string) => void;
}

export function InventoryReconciliation({ stops, onConfirm }: InventoryReconciliationProps) {
  const [additionalNotes, setAdditionalNotes] = useState("");

  const loadedItems = getAggregateLoadedItems(stops);
  const unloadedItems = getAggregateUnloadedItems(stops);
  const result = reconcileInventory(loadedItems, unloadedItems);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Inventory Reconciliation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Loaded: {result.summary.totalLoaded} items | Unloaded: {result.summary.totalUnloaded} items
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Matched Items */}
        {result.matched.length > 0 && (
          <Section
            title="Matched"
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            entries={result.matched}
            colorClass="bg-green-50 border-green-200"
          />
        )}

        {/* Missing Items */}
        {result.missing.length > 0 && (
          <Section
            title="Missing"
            icon={<XCircle className="h-4 w-4 text-red-600" />}
            entries={result.missing}
            colorClass="bg-red-50 border-red-200"
          />
        )}

        {/* Damaged Items */}
        {result.damaged.length > 0 && (
          <Section
            title="Damaged"
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            entries={result.damaged}
            colorClass="bg-amber-50 border-amber-200"
          />
        )}

        {/* Extra Items */}
        {result.extra.length > 0 && (
          <Section
            title="Extra (not in loading inventory)"
            icon={<HelpCircle className="h-4 w-4 text-blue-600" />}
            entries={result.extra}
            colorClass="bg-blue-50 border-blue-200"
          />
        )}

        {result.matched.length > 0 && result.missing.length === 0 && result.damaged.length === 0 && (
          <div className="text-center py-4 text-green-700 font-medium">
            All items accounted for with no damage detected.
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Foreman Notes</label>
          <Textarea
            placeholder="Any additional notes about discrepancies..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() => {
            const notes = JSON.stringify({
              reconciliation: result,
              foremanNotes: additionalNotes,
              timestamp: new Date().toISOString(),
            });
            onConfirm(notes);
          }}
        >
          Confirm & Continue
        </Button>
      </CardFooter>
    </Card>
  );
}

function Section({
  title,
  icon,
  entries,
  colorClass,
}: {
  title: string;
  icon: React.ReactNode;
  entries: ReconciliationEntry[];
  colorClass: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
        {icon}
        {title} ({entries.length})
      </div>
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <div key={i} className="flex justify-between items-center text-sm">
            <div>
              <span className="font-medium">{entry.item.name}</span>
              {entry.item.category && (
                <span className="text-xs text-muted-foreground ml-2 capitalize">
                  {entry.item.category.replace("_", " ")}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">
                {entry.quantityLoaded} loaded / {entry.quantityUnloaded} unloaded
              </span>
              {entry.discrepancy && (
                <p className="text-xs font-medium">{entry.discrepancy}</p>
              )}
              {entry.item.conditionNotes && (
                <p className="text-xs italic">{entry.item.conditionNotes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
