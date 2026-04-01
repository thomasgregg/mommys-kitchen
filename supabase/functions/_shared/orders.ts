export const customerStatusNotificationMap = {
  accepted: {
    type: "order_accepted",
    title: "Order accepted",
    body: "Mommy's Kitchen has started your order.",
  },
  ready: {
    type: "order_ready",
    title: "Ready for pickup",
    body: "Your order is ready and waiting for you.",
  },
  cancelled: {
    type: "order_cancelled",
    title: "Order cancelled",
    body: "Your order has been cancelled. Check the app for details.",
  },
  rejected: {
    type: "order_rejected",
    title: "Order rejected",
    body: "Your order could not be accepted. Open the app for details.",
  },
} as const;

export const mommyOrderPlacedNotification = {
  type: "order_placed",
  title: "New order placed",
  body: (orderNumber: string) =>
    `${orderNumber} is waiting in the kitchen queue.`,
} as const;

export type NotifiableOrderStatus = keyof typeof customerStatusNotificationMap;

export function isNotifiableStatus(
  status: string,
): status is NotifiableOrderStatus {
  return status in customerStatusNotificationMap;
}
