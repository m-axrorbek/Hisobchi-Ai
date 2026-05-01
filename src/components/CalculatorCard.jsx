import { useMemo, useState } from "react";
import { Calculator, Equal, Eraser, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "x", "1", "2", "3", "-", "0", ".", "C", "+"];

const sanitizeExpression = (expression) => expression.replace(/x/gi, "*");

const formatNumber = (value) => new Intl.NumberFormat("uz-UZ").format(Number(value || 0));

const evaluateExpression = (expression) => {
  const sanitized = sanitizeExpression(expression);
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) {
    return 0;
  }

  try {
    const result = Function(`"use strict"; return (${sanitized})`)();
    return Number.isFinite(result) ? Math.round(result) : 0;
  } catch (_error) {
    return 0;
  }
};

const CalculatorCard = ({ onUseResult }) => {
  const [expression, setExpression] = useState("");
  const result = useMemo(() => evaluateExpression(expression), [expression]);

  const append = (key) => {
    if (key === "C") {
      setExpression("");
      return;
    }

    setExpression((current) => `${current}${key}`);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-ink-500 dark:text-ink-300" />
          <CardTitle className="section-title">Kalkulyator</CardTitle>
        </div>
        <CardDescription>Kichik hisob-kitobni shu yerda qiling va natijani yozuvga yuboring.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-950">
          <p className="min-h-[24px] text-sm text-ink-500 dark:text-ink-400">{expression || "0"}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-ink-50">{formatNumber(result)}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              variant={key === "C" ? "outline" : "secondary"}
              className="rounded-2xl"
              onClick={() => append(key)}
            >
              {key === "C" ? <Eraser className="h-4 w-4" /> : key}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setExpression(String(result || ""))}>
            <Equal className="h-4 w-4" /> Natijani qoldirish
          </Button>
          <Button type="button" className="rounded-2xl" onClick={() => onUseResult?.(result)} disabled={!result}>
            <Plus className="h-4 w-4" /> Natijani yozuvga qo'shish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalculatorCard;
