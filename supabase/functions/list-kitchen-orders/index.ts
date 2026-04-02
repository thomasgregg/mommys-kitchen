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

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      throw profileError ?? new Error("Profile not found");
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can access the kitchen queue." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: orders, error: ordersError } = await adminClient
      .from("orders")
      .select("*, order_items(*), order_status_history(*)")
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const userIds = [...new Set((orders ?? []).map((order) => order.user_id))];
    const { data: profiles, error: profilesError } = userIds.length === 0
      ? { data: [], error: null }
      : await adminClient
        .from("profiles")
        .select("id, full_name, phone, role, created_at, updated_at")
        .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    const ordersWithCustomers = (orders ?? []).map((order) => ({
      order,
      customer: (profiles ?? []).find((candidate) =>
        candidate.id === order.user_id
      ) ?? null,
    }));

    return new Response(JSON.stringify({ orders: ordersWithCustomers }), {
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
