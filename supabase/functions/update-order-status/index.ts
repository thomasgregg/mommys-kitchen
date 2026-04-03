import { corsHeaders } from "../_shared/cors.ts";
import { sendCustomerOrderStatusPush } from "../_shared/apns.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type UpdateOrderStatusRequest = {
  order_id: string;
  new_status: string;
  note?: string;
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

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      throw profileError ?? new Error("Profile not found");
    }

    const body = (await request.json()) as UpdateOrderStatusRequest;
    const isCustomerCancellation = profile.role === "customer" &&
      body.new_status === "cancelled";

    if (profile.role !== "admin" && !isCustomerCancellation) {
      return new Response(
        JSON.stringify({ error: "Only admins can perform this transition." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: updatedOrder, error: transitionError } = await adminClient
      .rpc("apply_order_status_transition", {
        p_order_id: body.order_id,
        p_new_status: body.new_status,
        p_changed_by_user_id: userData.user.id,
        p_note: body.note ?? null,
      });

    if (transitionError || !updatedOrder) {
      throw transitionError ?? new Error("Transition failed");
    }

    if (
      ["accepted", "preparing", "ready", "completed", "cancelled", "rejected"]
        .includes(updatedOrder.status)
    ) {
      try {
        await sendCustomerOrderStatusPush({
          userId: updatedOrder.user_id,
          tenantId: updatedOrder.tenant_id,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
        });
      } catch (pushError) {
        console.error(
          "Push side effect failed after order status transition",
          pushError,
        );
      }
    }

    return new Response(JSON.stringify({ order: updatedOrder }), {
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
