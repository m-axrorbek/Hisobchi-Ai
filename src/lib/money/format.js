const INTEGER_FORMATTER = new Intl.NumberFormat("uz-UZ", {
  maximumFractionDigits: 0
});

const DECIMAL_FORMATTER = new Intl.NumberFormat("uz-UZ", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

export const formatMoney = (amount, currency = "UZS") => `${currency} ${formatAmountNumber(amount)}`;

export const formatCompactMoney = (amount, currency = "UZS") => {
  const value = toMoneyNumber(amount);
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000000000) {
    return `${currency} ${formatScaled(value / 1000000000)} mlrd`;
  }

  return formatMoney(value, currency);
};

export const formatAmountNumber = (amount) => INTEGER_FORMATTER.format(toMoneyNumber(amount));

const formatScaled = (value) => {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) {
    return INTEGER_FORMATTER.format(rounded);
  }

  return DECIMAL_FORMATTER.format(rounded);
};

const toMoneyNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
