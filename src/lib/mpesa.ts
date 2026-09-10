export const sanitizePhoneInput = (value: string): string =>
  value
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 13);

export const isValidKenyanMobileNumber = (value: string): boolean => {
  const cleaned = value.trim();

  if (!cleaned) {
    return false;
  }

  if (cleaned.startsWith("+")) {
    return /^\+254(7|1)\d{8}$/.test(cleaned);
  }

  return /^(0(7|1)\d{8}|254(7|1)\d{8})$/.test(cleaned);
};

export const normalizePhoneNumberForPayload = (value: string): string => {
  const cleaned = sanitizePhoneInput(value);

  if (cleaned.startsWith("+254")) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    return `254${cleaned.slice(1)}`;
  }

  if (/^(7|1)\d{8}$/.test(cleaned)) {
    return `254${cleaned}`;
  }

  return cleaned;
};

export const isTransientMpesaStatusError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("Failed to query M-Pesa payment status") ||
    error.message.includes("500.001.1001") ||
    error.message.includes("405") ||
    error.message.includes("404") ||
    error.message.includes("Method Not Allowed") ||
    error.message.includes("Failed to fetch"));

export const getFriendlyMpesaFailureMessage = (description?: string): string => {
  if (!description) return "M-Pesa payment was cancelled or failed.";
  if (description.toLowerCase().includes("user cannot be reached")) {
    return "The phone could not be reached for the M-Pesa prompt. Confirm the number is active, on, and has network, then try again.";
  }
  return description;
};
