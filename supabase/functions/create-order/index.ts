import { sendMommyOrderPlacedPush } from "../_shared/apns.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type CreateOrderRequest = {
  items: Array<{
    menu_item_id: string;
    quantity: number;
  }>;
  notes?: string;
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

    const body = (await request.json()) as CreateOrderRequest;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one cart item is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cartItems = body.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
    }));

    const { data: order, error: orderError } = await adminClient.rpc(
      "create_order_for_user",
      {
        p_user_id: userData.user.id,
        p_cart_items: cartItems,
        p_notes: body.notes ?? null,
      },
    );

    if (orderError || !order) {
      throw orderError ?? new Error("Order creation failed");
    }

    const { data: fullOrder, error: fetchError } = await adminClient
      .from("orders")
      .select(`
        *,
        order_items (*),
        order_status_history (*)
      `)
      .eq("id", order.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    try {
      await sendMommyOrderPlacedPush({
        orderId: fullOrder.id,
        orderNumber: fullOrder.order_number,
      });
    } catch (pushError) {
      console.error("Push side effect failed after order creation", pushError);
    }

    return new Response(JSON.stringify({ order: fullOrder }), {
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
