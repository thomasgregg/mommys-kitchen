"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppSettings } from "@/lib/types/app";
import { formatCurrency } from "@/lib/utils/currency";

type Point = {
  key: string;
  label: string;
  orders: number;
  revenueCents: number;
};

const chartConfig = {
  orders: {
    label: "Orders",
    color: "#2C3646",
  },
  revenue: {
    label: "Revenue",
    color: "#2C3646",
  },
} satisfies ChartConfig;

export function OrdersOverTimeChart({
  data,
  settings,
}: {
  data: Point[];
  settings: Pick<AppSettings, "currency_code" | "locale_identifier">;
}) {
  const revenueData = data.map((point) => ({
    ...point,
    revenue: Math.round(point.revenueCents / 100),
  }));

  return (
    <Tabs defaultValue="orders" className="gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Order activity</p>
          <p className="text-sm text-muted-foreground">Volume and revenue from persisted orders.</p>
        </div>
        <TabsList variant="line">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="orders">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: -12, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => <span>{value} orders</span>} />}
            />
            <Bar dataKey="orders" radius={8} fill="var(--color-orders)" />
          </BarChart>
        </ChartContainer>
      </TabsContent>

      <TabsContent value="revenue">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart accessibilityLayer data={revenueData} margin={{ left: -12, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => <span>{formatCurrency(Number(value) * 100, settings)}</span>} />}
            />
            <Bar dataKey="revenue" radius={8} fill="var(--color-revenue)" />
          </BarChart>
        </ChartContainer>
      </TabsContent>
    </Tabs>
  );
}
