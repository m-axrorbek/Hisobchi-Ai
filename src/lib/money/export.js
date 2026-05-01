import { format } from "date-fns";
import { buildMoneyAnalytics } from "./analytics.js";
import { formatMoney } from "./format.js";

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const exportRecordsToCsv = (records) => {
  if (!ensureExportableRecords(records)) {
    return;
  }

  const rows = [
    ["Sana", "Vaqt", "Turi", "Narsa", "Miqdor", "Summa", "Kategoriya", "Odam", "Do'kon", "Holat", "Izoh"],
    ...records.map((record) => [
      record.date,
      record.time,
      record.type,
      record.item,
      record.quantity,
      record.amount,
      record.category,
      record.person,
      record.store,
      record.payment_status,
      record.note
    ])
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadFile(csv, `hisobchi-ai-${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv;charset=utf-8;");
};

export const exportRecordsToPrintableReport = (records) => {
  if (!ensureExportableRecords(records)) {
    return;
  }

  const analytics = buildMoneyAnalytics(records);
  const rows = records
    .map(
      (record) => `
        <tr>
          <td>${record.date}</td>
          <td>${record.time}</td>
          <td>${record.item || "-"}</td>
          <td>${record.person || record.store || "-"}</td>
          <td>${record.category || "-"}</td>
          <td>${formatMoney(record.amount)}</td>
          <td>${record.payment_status || "-"}</td>
        </tr>`
    )
    .join("");

  const reportWindow = window.open("", "_blank", "width=960,height=720");
  if (!reportWindow) {
    return;
  }

  reportWindow.document.write(`
    <html>
      <head>
        <title>Hisobchi Ai report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1, h2 { margin: 0 0 12px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
          .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>Hisobchi Ai</h1>
        <p>${format(new Date(), "dd MMM yyyy, HH:mm")}</p>
        <div class="stats">
          <div class="card"><strong>Bugun</strong><br/>${formatMoney(analytics.totals.today)}</div>
          <div class="card"><strong>Hafta</strong><br/>${formatMoney(analytics.totals.week)}</div>
          <div class="card"><strong>Oy</strong><br/>${formatMoney(analytics.totals.month)}</div>
        </div>
        <h2>Yozuvlar</h2>
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Vaqt</th>
              <th>Narsa</th>
              <th>Odam/Do'kon</th>
              <th>Kategoriya</th>
              <th>Summa</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
};

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const ensureExportableRecords = (records) => {
  if (Array.isArray(records) && records.length > 0) {
    return true;
  }

  if (typeof window !== "undefined") {
    window.alert("Yozuvlar yoki xarajatlar mavjud emas.");
  }

  return false;
};
