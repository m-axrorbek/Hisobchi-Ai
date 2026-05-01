import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { buildMoneyAnalytics, getVisibleRecords } from "../lib/money/analytics.js";
import { formatCompactMoney, formatMoney } from "../lib/money/format.js";
import { useMoneyStore } from "../store/useMoneyStore";

const tooltipProps = {
  contentStyle: {
    background: "var(--tooltip-bg)",
    border: "1px solid var(--tooltip-border)",
    borderRadius: "12px",
    color: "var(--tooltip-text)"
  },
  itemStyle: { color: "var(--tooltip-text)" },
  labelStyle: { color: "var(--tooltip-text)" }
};

const Analytics = () => {
  const records = useMoneyStore((state) => state.records);
  const visible = getVisibleRecords(records);
  const stats = useMemo(() => buildMoneyAnalytics(visible), [visible]);

  if (!visible.length) {
    return (
      <Card className="border-dashed bg-transparent dark:border-ink-700">
        <CardContent className="py-20 text-center">
          <p className="text-xl font-semibold text-ink-950 dark:text-ink-50">Hali yozuvlar yo'q</p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">Xarajat yoki qarz qo'shsangiz, foydali analiz shu yerda chiqadi.</p>
        </CardContent>
      </Card>
    );
  }

  const debtPie = [
    { name: "Faol qarz", value: stats.debts.activeAmount, color: "var(--pie-completed)" },
    { name: "Yopilgan qarz", value: stats.debts.paidAmount, color: "var(--pie-pending)" }
  ];

  return (
    <div className="space-y-6 pb-36">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Bugungi xarajat" value={formatCompactMoney(stats.totals.today)} />
        <StatCard title="Haftalik xarajat" value={formatCompactMoney(stats.totals.week)} />
        <StatCard title="Oylik xarajat" value={formatCompactMoney(stats.totals.month)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Faol qarzlar" value={`${stats.debts.activeCount} ta`} subValue={formatMoney(stats.debts.activeAmount)} />
        <StatCard title="Yopilgan qarzlar" value={`${stats.debts.paidCount} ta`} subValue={formatMoney(stats.debts.paidAmount)} />
        <StatCard title="Eng katta kategoriya" value={stats.mostExpensiveCategory} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="section-title">Kunlik xarajatlar</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <div className="h-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.daily}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(127,127,127,0.18)" />
                <XAxis dataKey="label" stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="amount" fill="var(--chart-bar)" radius={[10, 10, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartSummaryList title="Kunlik xarajatlar matnli xulosasi" items={stats.charts.daily} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Qarzlar holati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-56">
              <div className="h-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipProps} />
                  <Pie data={debtPie} dataKey="value" innerRadius={52} outerRadius={84} paddingAngle={4} stroke="none">
                    {debtPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <ChartSummaryList title="Qarzlar holati matnli xulosasi" items={debtPie.map((entry) => ({ label: entry.name, amount: entry.value }))} />
            <div className="grid gap-2 text-sm text-ink-700 dark:text-ink-100">
              {debtPie.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between rounded-2xl bg-ink-50 px-3 py-2 dark:bg-ink-800/90">
                  <span>{entry.name}</span>
                  <span>{formatMoney(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="section-title">Haftalik trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <div className="h-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.charts.weekly}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(127,127,127,0.18)" />
                <XAxis dataKey="label" stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="amount" stroke="var(--chart-bar)" strokeWidth={2.5} dot={false} />
              </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartSummaryList title="Haftalik trend matnli xulosasi" items={stats.charts.weekly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Oylik trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <div className="h-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.monthly}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(127,127,127,0.18)" />
                <XAxis dataKey="label" stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--chart-axis)" tickLine={false} axisLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="amount" fill="var(--chart-bar)" radius={[10, 10, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartSummaryList title="Oylik trend matnli xulosasi" items={stats.charts.monthly} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="section-title">AI xulosa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-ink-50 p-5 text-base text-ink-700 dark:bg-ink-800/90 dark:text-ink-100">
              {stats.summary}
            </div>
            <SummaryList title="Kimga qarzdorman" items={stats.debts.iOwe} />
            <SummaryList title="Kim menga qarzdor" items={stats.debts.owedToMe} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue = "" }) => (
  <Card>
    <CardContent className="space-y-2 px-5 py-5">
      <p className="text-sm text-ink-500 dark:text-ink-300">{title}</p>
      <p className="section-title text-3xl font-semibold text-ink-950 dark:text-ink-50">{value}</p>
      {subValue ? <p className="text-sm text-ink-500 dark:text-ink-400">{subValue}</p> : null}
    </CardContent>
  </Card>
);

const SummaryList = ({ title, items }) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</p>
    {items.length ? (
      items.slice(0, 4).map((item) => (
        <div key={item.name} className="flex items-center justify-between rounded-2xl bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/80">
          <span>{item.name}</span>
          <span>{formatMoney(item.amount)}</span>
        </div>
      ))
    ) : (
      <p className="text-sm text-ink-500 dark:text-ink-400">Hozircha yo'q</p>
    )}
  </div>
);

const ChartSummaryList = ({ title, items }) => (
  <div className="sr-only">
    <p>{title}</p>
    <ul>
      {items.map((item) => (
        <li key={item.label}>{item.label}: {formatMoney(item.amount)}</li>
      ))}
    </ul>
  </div>
);

export default Analytics;
