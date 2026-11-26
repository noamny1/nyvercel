"use client";

import { useMemo, useState } from "react";

export type CrmRow = {
  id: number;
  name: string;
  city: string | null;
  status: string | null;
  workContent: string | null;
  notes: string | null;
  oneTimeCharge: number | null;
  monthlyPay: number | null;
  monthlyPay2: number | null;
  internetCost: number | null;
  clientType: string | null;
  infrastructure: string | null;
  paymentMethod: string | null;
  theme: string | null;
  installDate: string | null;
  hotLine: string | null;
  ipDns: string | null;
  loginUser: string | null;
  loginPass: string | null;
  modemData: string | null;
  subscriberId: string | null;
  modemPass: string | null;
  dvrType: string | null;
  dvrIp: string | null;
  dvrPorts: string | null;
  dvrUser: string | null;
  dvrPass: string | null;
  screenCount: number | null;
  addressCount: number | null;
  bank: string | null;
  branch: string | null;
  account: string | null;
  files: string | null;
  paidUntil: string | null;
  mondayId: string | null;
};

const COLUMNS: { key: keyof CrmRow; label: string; money?: boolean }[] = [
  { key: "name", label: "שם" },
  { key: "city", label: "עיר" },
  { key: "status", label: "סטטוס" },
  { key: "clientType", label: "סוג לקוח" },
  { key: "workContent", label: "תכולת העבודה" },
  { key: "notes", label: "הערות" },
  { key: "oneTimeCharge", label: "חיוב חד פעמי", money: true },
  { key: "monthlyPay", label: "תשלום חודשי", money: true },
  { key: "monthlyPay2", label: "תשלום חודשי 2", money: true },
  { key: "internetCost", label: "הוצאה חודשית קו אינטרנט", money: true },
  { key: "infrastructure", label: "תשתית" },
  { key: "paymentMethod", label: "אמצעי תשלום" },
  { key: "theme", label: "תימה" },
  { key: "installDate", label: "תאריך התקנה" },
  { key: "hotLine", label: "מספר קו הוט/בזק" },
  { key: "ipDns", label: "IP/DNS" },
  { key: "loginUser", label: "User" },
  { key: "loginPass", label: "Pass" },
  { key: "modemData", label: "נתוני מודם/סים" },
  { key: "subscriberId", label: "מס מנוי" },
  { key: "modemPass", label: "סיסמא מודם" },
  { key: "dvrType", label: "סוג DVR" },
  { key: "dvrIp", label: "Ip Dvr" },
  { key: "dvrPorts", label: "Ports" },
  { key: "dvrUser", label: "User Dvr" },
  { key: "dvrPass", label: "Pass Dvr" },
  { key: "screenCount", label: "מס' מסכים בבניין" },
  { key: "addressCount", label: "מס' כתובות לתשלום" },
  { key: "bank", label: "בנק" },
  { key: "branch", label: "סניף" },
  { key: "account", label: "מספר חשבון" },
  { key: "paidUntil", label: "שולם עד" },
  { key: "files", label: "Files" },
  { key: "mondayId", label: "Item ID" },
];

const FILTERS: { key: keyof CrmRow; label: string }[] = [
  { key: "city", label: "עיר" },
  { key: "clientType", label: "סוג לקוח" },
  { key: "infrastructure", label: "תשתית" },
  { key: "paymentMethod", label: "אמצעי תשלום" },
  { key: "theme", label: "תימה" },
];

function show(row: CrmRow, key: keyof CrmRow, money?: boolean) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "—";
  if (money && typeof value === "number") return `₪${value}`;
  return String(value);
}

function options(rows: CrmRow[], key: keyof CrmRow) {
  return [...new Set(rows.map((row) => String(row[key] || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
}

export function ClientsTable({ rows }: { rows: CrmRow[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const pageSize = 80;

  const lists = useMemo(() => Object.fromEntries(FILTERS.map((filter) => [filter.key, options(rows, filter.key)])), [rows]);

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (FILTERS.some((filter) => filters[filter.key] && String(row[filter.key] || "") !== filters[filter.key])) return false;
      if (!needle) return true;
      return COLUMNS.some((column) => String(row[column.key] ?? "").toLowerCase().includes(needle));
    });
  }, [rows, query, filters]);

  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = matched.slice(current * pageSize, current * pageSize + pageSize);

  if (rows.length === 0) {
    return (
      <div className="crm-table">
        <h2>אין לקוחות</h2>
        <p>הרשימה ריקה. אפשר להעלות קובץ חדש.</p>
      </div>
    );
  }

  return (
    <div className="crm-table">
      <div className="crm-tools">
        <h2>כתובות פעילות ({matched.length})</h2>
        <input
          className="crm-search"
          value={query}
          placeholder="חיפוש בכל העמודות"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
        {FILTERS.map((filter) => (
          <select
            key={filter.key}
            value={filters[filter.key] || ""}
            onChange={(event) => {
              setFilters((current) => ({ ...current, [filter.key]: event.target.value }));
              setPage(0);
            }}
          >
            <option value="">{filter.label}</option>
            {lists[filter.key].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ))}
      </div>
      <div className="crm-scroll">
        <table>
          <thead>
            <tr>{COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id}>
                {COLUMNS.map((column) => <td key={column.key}>{show(row, column.key, column.money)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="crm-pager">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>הקודם</button>
        <span>{current + 1} / {pages}</span>
        <button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>הבא</button>
      </div>
    </div>
  );
}
