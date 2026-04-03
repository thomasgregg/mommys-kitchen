import { createAdminClient } from "./supabase.ts";
import {
  customerStatusNotificationMap,
  isNotifiableStatus,
  mommyOrderPlacedNotification,
} from "./orders.ts";

type AppTarget = "customer_ios" | "mommy_ios";
type PushEnvironment = "sandbox" | "production";
type NotificationType =
  | "order_placed"
  | "order_accepted"
  | "order_preparing"
  | "order_ready"
  | "order_completed"
  | "order_cancelled"
  | "order_rejected";

type TokenRecord = {
  tenant_id: string;
  user_id: string;
  device_token: string;
  app_target: AppTarget;
  push_environment: PushEnvironment;
};

type PushMessage = {
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string;
  appTarget: AppTarget;
  status?: string;
  userIds: string[];
};

function pemToDer(privateKeyPem: string) {
  const normalized = privateKeyPem.replace(/\\n/g, "\n");
  const pemBody = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  return Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));
}

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input;

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createApnsJwt() {
  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "";
  const keyId = Deno.env.get("APNS_KEY_ID") ?? "";
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY") ?? "";

  if (!teamId || !keyId || !privateKey) {
    return null;
  }

  const header = base64UrlEncode(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  }));
  const unsignedToken = `${header}.${claims}`;

  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function resolveBundleId(appTarget: AppTarget) {
  if (appTarget === "customer_ios") {
    return Deno.env.get("APNS_CUSTOMER_BUNDLE_ID") ?? "com.mommyskitchen.app";
  }

  return Deno.env.get("APNS_MOMMY_BUNDLE_ID") ?? "com.mommyskitchen.mommy";
}

function resolveApnsHost(pushEnvironment: PushEnvironment) {
  return pushEnvironment === "sandbox"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";
}

async function recordNotification(
  adminClient: ReturnType<typeof createAdminClient>,
  token: TokenRecord,
  message: PushMessage,
  response: Response,
  responseText: string,
) {
  await adminClient.from("notifications").insert({
    tenant_id: message.tenantId,
    user_id: token.user_id,
    order_id: message.orderId,
    type: message.type,
    title: message.title,
    body: message.body,
    status: response.ok ? "sent" : "failed",
    provider: "apns",
    app_target: message.appTarget,
    external_id: response.headers.get("apns-id"),
    payload_json: {
      app_target: message.appTarget,
      push_environment: token.push_environment,
      status: message.status ?? null,
      response: response.ok ? null : responseText,
    },
    sent_at: response.ok ? new Date().toISOString() : null,
    failed_at: response.ok ? null : new Date().toISOString(),
  });
}

async function sendPushMessage(message: PushMessage) {
  if (message.userIds.length === 0) {
    return;
  }

  const adminClient = createAdminClient();
  const { data: tokens, error: tokenError } = await adminClient
    .from("device_tokens")
    .select("tenant_id, user_id, device_token, app_target, push_environment")
    .in("user_id", message.userIds)
    .eq("tenant_id", message.tenantId)
    .eq("app_target", message.appTarget);

  if (tokenError) {
    throw tokenError;
  }

  if (!tokens || tokens.length === 0) {
    return;
  }

  const jwt = await createApnsJwt();
  if (!jwt) {
    console.warn("Skipping APNs send because APNs credentials are missing.");
    return;
  }

  await Promise.all(
    (tokens as TokenRecord[]).map(async (token) => {
      const bundleId = resolveBundleId(token.app_target);
      if (!bundleId) {
        return;
      }

      const payload = {
        aps: {
          alert: {
            title: message.title,
            body: message.body,
          },
          sound: "default",
        },
        type: message.type,
        order_id: message.orderId,
        status: message.status ?? null,
      };

      const response = await fetch(
        `${
          resolveApnsHost(token.push_environment)
        }/3/device/${token.device_token}`,
        {
          method: "POST",
          headers: {
            authorization: `bearer ${jwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const responseText = await response.text();
      await recordNotification(
        adminClient,
        token,
        message,
        response,
        responseText,
      );
    }),
  );
}

export async function sendCustomerOrderStatusPush({
  userId,
  orderId,
  status,
  tenantId,
}: {
  userId: string;
  orderId: string;
  status: string;
  tenantId: string;
}) {
  if (!isNotifiableStatus(status)) {
    return;
  }

  const definition = customerStatusNotificationMap[status];
  await sendPushMessage({
    userIds: [userId],
    tenantId,
    orderId,
    appTarget: "customer_ios",
    status,
    type: definition.type,
    title: definition.title,
    body: definition.body,
  });
}

export async function sendMommyOrderPlacedPush({
  tenantId,
  orderId,
  orderNumber,
}: {
  tenantId: string;
  orderId: string;
  orderNumber: string;
}) {
  const adminClient = createAdminClient();
  const { data: admins, error } = await adminClient
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin");

  if (error) {
    throw error;
  }

  const userIds = (admins ?? []).map((admin) => admin.id as string);
  if (userIds.length === 0) {
    return;
  }

  await sendPushMessage({
    userIds,
    tenantId,
    orderId,
    appTarget: "mommy_ios",
    type: mommyOrderPlacedNotification.type,
    title: mommyOrderPlacedNotification.title,
    body: mommyOrderPlacedNotification.body(orderNumber),
  });
}
