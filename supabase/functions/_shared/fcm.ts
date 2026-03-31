import { createAdminClient } from "./supabase.ts";
import { isNotifiableStatus, statusNotificationMap } from "./orders.ts";

type SendOrderPushInput = {
  userId: string;
  orderId: string;
  status: string;
};

type GoogleServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

async function importPrivateKey(privateKeyPem: string) {
  const normalized = privateKeyPem.replace(/\\n/g, "\n");
  const pemBody = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(
    atob(pemBody),
    (char) => char.charCodeAt(0),
  );

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

async function createGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const unsignedToken = `${header}.${claimSet}`;

  const key = await importPrivateKey(serviceAccount.privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const signedJwt = `${unsignedToken}.${
    base64UrlEncode(new Uint8Array(signature))
  }`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to obtain Google access token: ${errorText}`);
  }

  const tokenJson = await tokenResponse.json();
  return tokenJson.access_token as string;
}

export async function sendOrderPush(
  { userId, orderId, status }: SendOrderPushInput,
) {
  if (!isNotifiableStatus(status)) {
    return;
  }

  const adminClient = createAdminClient();
  const { data: tokens, error: tokenError } = await adminClient
    .from("device_tokens")
    .select("id, fcm_token")
    .eq("user_id", userId);

  if (tokenError) {
    throw tokenError;
  }

  if (!tokens || tokens.length === 0) {
    return;
  }

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL") ?? "";
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "";

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "Skipping FCM send because Firebase service account secrets are missing.",
    );
    return;
  }

  const accessToken = await createGoogleAccessToken({
    projectId,
    clientEmail,
    privateKey,
  });
  const messageDefinition = statusNotificationMap[status];

  await Promise.all(
    tokens.map(async ({ fcm_token }) => {
      const payload = {
        message: {
          token: fcm_token,
          notification: {
            title: messageDefinition.title,
            body: messageDefinition.body,
          },
          data: {
            type: messageDefinition.type,
            order_id: orderId,
            status,
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                contentAvailable: true,
              },
            },
          },
        },
      };

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const responseJson = await response.json().catch(() => null);
      const notificationInsert = {
        user_id: userId,
        order_id: orderId,
        type: messageDefinition.type,
        title: messageDefinition.title,
        body: messageDefinition.body,
        provider: "fcm",
        payload_json: payload,
        external_id: responseJson?.name ?? null,
        status: response.ok ? "sent" : "failed",
        sent_at: response.ok ? new Date().toISOString() : null,
        failed_at: response.ok ? null : new Date().toISOString(),
      };

      await adminClient.from("notifications").insert(notificationInsert);
    }),
  );
}
