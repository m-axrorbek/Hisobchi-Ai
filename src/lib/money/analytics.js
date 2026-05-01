import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from "date-fns";
import { isArchivedRecord, isDebtRecord, isExpenseRecord } from "./records.js";

const sumAmount = (records, field = "amount") =>
  records.reduce((total, record) => total + Number(record?.[field] || 0), 0);

export const getVisibleRecords = (records) => records.filter((record) => !isArchivedRecord(record));

export const getActiveDebts = (records) =>
  getVisibleRecords(records).filter(
    (record) => isDebtRecord(record) && ["unpaid", "partial"].includes(record.payment_status)
  );

export const getPaidDebts = (records) =>
  getVisibleRecords(records).filter((record) => isDebtRecord(record) && record.payment_status === "paid");

export const getRecordsByFilter = (records, filter, showArchived = false) => {
  const base = showArchived ? records.filter((record) => record.archived) : getVisibleRecords(records);

  if (filter === "all") return base;
  if (filter === "expense") return base.filter((record) => record.type === "expense");
  if (filter === "debt_taken") return base.filter((record) => record.type === "debt_taken");
  if (filter === "debt_given") return base.filter((record) => record.type === "debt_given");
  if (filter === "paid_debts") {
    return base.filter((record) => isDebtRecord(record) && record.payment_status === "paid");
  }
  if (filter === "active_debts") {
    return base.filter((record) => isDebtRecord(record) && ["unpaid", "partial"].includes(record.payment_status));
  }

  return base;
};

export const buildDailyExpenseSummary = (records) => {
  const expenseRecords = getVisibleRecords(records).filter((record) => isExpenseRecord(record));
  const totals = expenseRecords.reduce((accumulator, record) => {
    const key = record.date || format(toRecordDate(record), "yyyy-MM-dd");
    accumulator[key] = (accumulator[key] || 0) + Number(record.amount || 0);
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([date, amount]) => ({
      date,
      label: format(parseISO(`${date}T00:00:00`), "dd MMM"),
      amount
    }))
    .sort((left, right) => parseISO(`${right.date}T00:00:00`) - parseISO(`${left.date}T00:00:00`));
};

export const buildMoneyAnalytics = (records) => {
  const visible = getVisibleRecords(records);
  const expenseRecords = visible.filter((record) => isExpenseRecord(record));
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todayExpenses = expenseRecords.filter((record) => isSameDay(toRecordDate(record), now));
  const weeklyExpenses = expenseRecords.filter((record) => {
    const date = toRecordDate(record);
    return date >= weekStart && date <= weekEnd;
  });
  const monthlyExpenses = expenseRecords.filter((record) => {
    const date = toRecordDate(record);
    return date >= monthStart && date <= monthEnd;
  });

  const activeDebts = getActiveDebts(visible);
  const paidDebts = getPaidDebts(visible);
  const debtTaken = activeDebts.filter((record) => record.type === "debt_taken");
  const debtGiven = activeDebts.filter((record) => record.type === "debt_given");

  const categoryTotals = monthlyExpenses.reduce((accumulator, record) => {
    const category = record.category || "boshqa";
    accumulator[category] = (accumulator[category] || 0) + Number(record.amount || 0);
    return accumulator;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((left, right) => right[1] - left[1]);
  const mostExpensiveCategory = sortedCategories[0]?.[0] || "boshqa";

  return {
    totals: {
      today: sumAmount(todayExpenses),
      week: sumAmount(weeklyExpenses),
      month: sumAmount(monthlyExpenses)
    },
    debts: {
      activeCount: activeDebts.length,
      activeAmount: sumAmount(activeDebts, "remaining_amount"),
      paidCount: paidDebts.length,
      paidAmount: sumAmount(paidDebts, "paid_amount"),
      iOwe: groupByPerson(debtTaken, "remaining_amount"),
      owedToMe: groupByPerson(debtGiven, "remaining_amount")
    },
    mostExpensiveCategory,
    charts: {
      daily: buildDailyChart(expenseRecords),
      weekly: buildWeeklyChart(expenseRecords),
      monthly: buildMonthlyChart(expenseRecords)
    },
    summary: buildAiLikeSummary({
      weekTotal: sumAmount(weeklyExpenses),
      monthTotal: sumAmount(monthlyExpenses),
      mostExpensiveCategory,
      activeDebtTotal: sumAmount(activeDebts, "remaining_amount")
    })
  };
};

export const buildAiLikeSummary = ({ weekTotal, monthTotal, mostExpensiveCategory, activeDebtTotal }) => {
  if (!weekTotal && !monthTotal && !activeDebtTotal) {
    return "Hozircha yozuvlar kam, yangi xarajat yoki qarz qo'shing.";
  }

  if (weekTotal && mostExpensiveCategory && mostExpensiveCategory !== "boshqa") {
    return `Bu hafta eng ko'p pul ${mostExpensiveCategory}ga ketgan.`;
  }

  if (activeDebtTotal > monthTotal && activeDebtTotal > 0) {
    return "Faol qarzlar xarajatlardan ko'proq, qarzlarni yopish rejasini ko'rib chiqing.";
  }

  return "Oylik yozuvlar tartibli ketmoqda, xarajatlarni kuzatishda davom eting.";
};

const groupByPerson = (records, field) => {
  const map = new Map();

  records.forEach((record) => {
    const key = record.person || record.store || "Noma'lum";
    const current = map.get(key) || 0;
    map.set(key, current + Number(record[field] || 0));
  });

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount);
};

const buildDailyChart = (records) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = subDays(startOfDay(new Date()), 6 - index);
    const amount = sumAmount(records.filter((record) => isSameDay(toRecordDate(record), date)));
    return {
      label: format(date, "dd MMM"),
      amount
    };
  });

const buildWeeklyChart = (records) =>
  Array.from({ length: 6 }, (_, index) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 5 - index), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const amount = sumAmount(
      records.filter((record) => {
        const date = toRecordDate(record);
        return date >= weekStart && date <= weekEnd;
      })
    );

    return {
      label: format(weekStart, "dd MMM"),
      amount
    };
  });

const buildMonthlyChart = (records) =>
  Array.from({ length: 6 }, (_, index) => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - index));
    const monthEnd = endOfMonth(monthStart);
    const amount = sumAmount(
      records.filter((record) => {
        const date = toRecordDate(record);
        return date >= monthStart && date <= monthEnd;
      })
    );

    return {
      label: format(monthStart, "MMM"),
      amount
    };
  });

const toRecordDate = (record) => {
  if (record.date && record.time) {
    return new Date(`${record.date}T${record.time}`);
  }

  if (record.date) {
    return parseISO(`${record.date}T00:00:00`);
  }

  return new Date();
};
