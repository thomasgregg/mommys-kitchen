import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type RegisterDeviceTokenRequest = {
  fcm_token: string;
  platform: "ios";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();

    const { data: userData, error: authError } = await userClient.auth
      .getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as RegisterDeviceTokenRequest;
    if (!body.fcm_token) {
      return new Response(JSON.stringify({ error: "FCM token is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await adminClient
      .from("device_tokens")
      .upsert(
        {
          user_id: userData.user.id,
          fcm_token: body.fcm_token,
          platform: body.platform ?? "ios",
        },
        {
          onConflict: "fcm_token",
        },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ device_token: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
