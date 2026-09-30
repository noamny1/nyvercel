"use client";

import { useEffect, useState } from "react";

export function Markets({ rows }: { rows: { name: string; value: string }[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (rows.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % rows.length), 4000);
    return () => clearInterval(timer);
  }, [rows.length]);
  const row = rows[index];
  return (
    <div className="widget">
      <h3>מטבעות ומדדים</h3>
      <div>{row ? `${row.name}  ${row.value}` : "—"}</div>
    </div>
  );
}
