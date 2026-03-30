import Link from "next/link";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { StatusFilterChip } from "@/components/orders/status-filter-chip";
import { UserEditSheet } from "@/components/users/user-edit-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { OrderRecord, Profile } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { roleBadgeClass } from "@/lib/utils/admin-ui";
import { formatDate } from "@/lib/utils/currency";

type UserRow = Profile & {
  order_count: number;
  last_order_at: string | null;
  last_order_number: string | null;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: profiles, error: profilesError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .order("full_name", { ascending: true })
      .returns<Profile[]>(),
    supabase
      .from("orders")
      .select("id, user_id, order_number, created_at, status")
      .order("created_at", { ascending: false })
      .returns<Pick<OrderRecord, "id" | "user_id" | "order_number" | "created_at" | "status">[]>(),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const users: UserRow[] = (profiles ?? []).map((profile) => {
    const userOrders = (orders ?? []).filter((order) => order.user_id === profile.id);
    const latestOrder = userOrders[0];

    return {
      ...profile,
      order_count: userOrders.length,
      last_order_at: latestOrder?.created_at ?? null,
      last_order_number: latestOrder?.order_number ?? null,
    };
  });

  const adminCount = users.filter((user) => user.role === "admin").length;
  const customerCount = users.filter((user) => user.role === "customer").length;
  const query = (params.q ?? "").trim().toLowerCase();
  const roleFilterParam = (params.role ?? "").trim();
  const roleFilter = roleFilterParam === "all" ? "" : roleFilterParam;
  const filteredUsers = users.filter((user) => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const haystack = `${user.full_name ?? ""} ${user.phone ?? ""} ${user.last_order_number ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesRole && matchesQuery;
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users & roles</h1>
          <p className="text-sm text-muted-foreground">
            Keep access tight, edit a profile quickly, and only open the full customer record when you need order history.
          </p>
        </div>
      </section>

      <Card size="sm" className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              icon={<ShoppingBag className="size-4" />}
              label="Customers"
              value={String(customerCount)}
              filterKey="role"
              filterValue="customer"
              active={roleFilter === "customer"}
            />
            <StatusFilterChip
              icon={<ShieldCheck className="size-4" />}
              label="Admins"
              value={String(adminCount)}
              filterKey="role"
              filterValue="admin"
              active={roleFilter === "admin"}
            />
          </div>
          <OrdersFilterBar
            initialQuery={params.q ?? ""}
            placeholder="Search by name, phone, or order number"
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Customer directory</CardTitle>
          <CardDescription>Compact list with quick edits and a single click into the full record.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
              No profiles match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Recent activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.full_name || "Unnamed profile"}</p>
                          <p className="truncate text-sm text-muted-foreground">{user.phone || "No phone on file"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border", roleBadgeClass(user.role))}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{user.order_count}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm text-foreground">
                          {user.last_order_at ? formatDate(user.last_order_at) : "No orders yet"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.last_order_number || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <UserEditSheet profile={user} iconOnly />
                        <Button render={<Link href={"/users/" + user.id} />} nativeButton={false} variant="ghost" size="sm">
                          Open
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function initials(value: string | null) {
  if (!value) {
    return "MK";
  }

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MK";
}
