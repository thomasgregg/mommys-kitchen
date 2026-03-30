import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import type { OrderStatus } from "@/lib/types/app";
import { statusLabel } from "@/lib/utils/admin-ui";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  placed: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function StatusActionForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const availableTransitions = transitions[currentStatus];

  if (availableTransitions.length === 0) {
    return (
      <Alert>
        <AlertTitle>Status is final</AlertTitle>
        <AlertDescription>
          This order is already {statusLabel(currentStatus).toLowerCase()}. Only live orders can be advanced from this panel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={updateOrderStatusAction} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground">Next status</span>
          <SelectField
            name="newStatus"
            defaultValue={availableTransitions[0]}
            options={availableTransitions.map((status) => ({
              value: status,
              label: statusLabel(status),
            }))}
            className="h-10"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground">Kitchen note</span>
          <Textarea
            id="note"
            name="note"
            rows={4}
            placeholder="Optional note for the customer or internal kitchen log"
            className="rounded-xl bg-background"
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-border/60 pt-4">
        <SubmitButton label="Update order" variant="outline" size="lg" className="h-11 rounded-xl px-5" />
      </div>
    </form>
  );
}
