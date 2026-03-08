"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PostEngagement {
  content: string;
  likes: number;
  retweets: number;
  replies: number;
}

interface EngagementChartProps {
  data: PostEngagement[];
}

export function EngagementChart({ data }: EngagementChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Engagement Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-zinc-500">No engagement data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Engagement Breakdown (Recent Posts)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="content"
              tick={{ fill: "#71717a", fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                color: "#e4e4e7",
              }}
            />
            <Legend wrapperStyle={{ color: "#a1a1aa" }} />
            <Bar dataKey="likes" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="retweets" fill="#3f3f46" radius={[2, 2, 0, 0]} />
            <Bar dataKey="replies" fill="#a1a1aa" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
