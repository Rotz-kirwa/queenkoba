const NAIROBI_TIMEZONE = "Africa/Nairobi";

function normalizeDateInput(value?: string | null) {
  if (!value) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) return value;
  if (value.includes("T")) return `${value}Z`;
  return value;
}

export function formatNairobiDate(value?: string | null) {
  const normalized = normalizeDateInput(value);
  if (!normalized) return "N/A";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(normalized));
}

export function formatNairobiDateTime(value?: string | null) {
  const normalized = normalizeDateInput(value);
  if (!normalized) return "N/A";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(normalized));
}
