import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

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

    const userId = userData.user.id;

    const { error: deviceTokenError } = await adminClient
      .from("device_tokens")
      .delete()
      .eq("user_id", userId);

    if (deviceTokenError) {
      throw deviceTokenError;
    }

    const { error: notificationError } = await adminClient
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (notificationError) {
      throw notificationError;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name: "Deleted account",
        phone: null,
        role: "customer",
      })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      userId,
      true,
    );

    if (deleteUserError) {
      throw deleteUserError;
    }

    return new Response(JSON.stringify({ deleted: true }), {
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
