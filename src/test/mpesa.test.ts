import { describe, expect, it } from "vitest";
import {
  getFriendlyMpesaFailureMessage,
  isTransientMpesaStatusError,
  isValidKenyanMobileNumber,
  normalizePhoneNumberForPayload,
  sanitizePhoneInput,
} from "@/lib/mpesa";

describe("M-Pesa Phone Number Handling", () => {
  it("should sanitize phone inputs by stripping whitespace, hyphens, and non-digits", () => {
    expect(sanitizePhoneInput("+254 712 345 678")).toBe("+254712345678");
    expect(sanitizePhoneInput("0712-345-678")).toBe("0712345678");
    expect(sanitizePhoneInput("  0712 345 678  ")).toBe("0712345678");
  });

  it("should validate standard Kenyan 07xx and 01xx mobile numbers", () => {
    // Valid 07xx numbers
    expect(isValidKenyanMobileNumber("0712345678")).toBe(true);
    expect(isValidKenyanMobileNumber("+254712345678")).toBe(true);
    expect(isValidKenyanMobileNumber("254712345678")).toBe(true);

    // Valid 01xx numbers (newer Safaricom / Airtel prefixes)
    expect(isValidKenyanMobileNumber("0112345678")).toBe(true);
    expect(isValidKenyanMobileNumber("+254112345678")).toBe(true);
    expect(isValidKenyanMobileNumber("254112345678")).toBe(true);

    // Invalid numbers
    expect(isValidKenyanMobileNumber("")).toBe(false);
    expect(isValidKenyanMobileNumber("071234567")).toBe(false); // 9 digits
    expect(isValidKenyanMobileNumber("07123456789")).toBe(false); // 11 digits
    expect(isValidKenyanMobileNumber("0201234567")).toBe(false); // Landline
    expect(isValidKenyanMobileNumber("invalid_string")).toBe(false);
  });

  it("should normalize phone numbers to Safaricom Daraja format (254XXXXXXXXX)", () => {
    expect(normalizePhoneNumberForPayload("0712345678")).toBe("254712345678");
    expect(normalizePhoneNumberForPayload("+254712345678")).toBe("254712345678");
    expect(normalizePhoneNumberForPayload("712345678")).toBe("254712345678");
    expect(normalizePhoneNumberForPayload("0112345678")).toBe("254112345678");
    expect(normalizePhoneNumberForPayload("112345678")).toBe("254112345678");
    expect(normalizePhoneNumberForPayload("+254 712 345 678")).toBe("254712345678");
  });
});

describe("M-Pesa Status & Error Diagnostics", () => {
  it("should detect transient errors suitable for automatic polling retry", () => {
    expect(isTransientMpesaStatusError(new Error("Failed to query M-Pesa payment status"))).toBe(true);
    expect(isTransientMpesaStatusError(new Error("500.001.1001 internal timeout"))).toBe(true);
    expect(isTransientMpesaStatusError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientMpesaStatusError(new Error("Invalid PIN entered"))).toBe(false);
  });

  it("should provide actionable friendly messages for known Safaricom response codes", () => {
    const unreachable = "The user cannot be reached. Subscriber offline.";
    expect(getFriendlyMpesaFailureMessage(unreachable)).toContain("Confirm the number is active, on, and has network");

    expect(getFriendlyMpesaFailureMessage("Request cancelled by user")).toBe("Request cancelled by user");
    expect(getFriendlyMpesaFailureMessage()).toBe("M-Pesa payment was cancelled or failed.");
  });
});
