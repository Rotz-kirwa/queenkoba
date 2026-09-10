import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  MapPin,
  ShieldCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import AdaptiveImage from "@/components/AdaptiveImage";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import PromoCodePanel from "@/components/PromoCodePanel";
import CheckoutAddressStep from "@/components/checkout/CheckoutAddressStep";
import CheckoutDeliveryMethodStep from "@/components/checkout/CheckoutDeliveryMethodStep";
import CheckoutReviewStep from "@/components/checkout/CheckoutReviewStep";
import { useToast } from "@/hooks/use-toast";
import { getDeliveryZone } from "@/data/kenyaDelivery";
import { paymentAPI, ordersAPI, isApiOfflineError } from "@/lib/api";
import { getDeliveryFieldErrors, getFirstDeliveryError } from "@/lib/delivery";
import { sanitizePromoCodeInput } from "@/lib/promo";
import { products } from "@/data/products";
import SEO from "@/components/SEO";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  description: string;
  logo?: string;
}

type CheckoutStepId = "details" | "delivery" | "payment" | "review";

interface CheckoutStepDefinition {
  id: CheckoutStepId;
  label: string;
  title: string;
  description: string;
  ctaLabel?: string;
  icon: typeof MapPin;
}

interface CheckoutDraft {
  currentStep?: number;
  paymentMethod?: string;
  paymentDetails?: {
    phoneNumber?: string;
    bankName?: string;
  };
  formData?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

const paymentLogos: Record<string, string> = {
  mpesa: "/payment/mpesa.svg",
  airtel: "/payment/airtel.svg",
  airtel_money: "/payment/airtel.svg",
  card: "/payment/card.svg",
  bank_transfer: "",
};

const country = "Kenya";
const CHECKOUT_STORAGE_KEY = "queenkoba-checkout-progress";
const checkoutSteps: CheckoutStepDefinition[] = [
  {
    id: "details",
    label: "Details",
    title: "Contact & Address",
    description: "Start with the basics so we know who the order belongs to and where it is going.",
    ctaLabel: "Continue to delivery",
    icon: MapPin,
  },
  {
    id: "delivery",
    label: "Delivery",
    title: "Delivery Method",
    description: "Choose how you want the order to reach you after we prepare it.",
    ctaLabel: "Continue to payment",
    icon: Truck,
  },
  {
    id: "payment",
    label: "Payment",
    title: "Payment Setup",
    description: "Pick a payment option and add only the last detail needed before review.",
    ctaLabel: "Review order",
    icon: CreditCard,
  },
  {
    id: "review",
    label: "Review",
    title: "Final Confirmation",
    description: "Do one quick final check, then complete your order with confidence.",
    icon: ShieldCheck,
  },
];

const formatCurrency = (amount: number) => `KSh ${Math.round(amount).toLocaleString()}`;

const getBackendProductId = (product: { apiId?: number; id: string }) => {
  if (product.apiId !== undefined) {
    return String(product.apiId);
  }

  if (/^\d+$/.test(product.id)) {
    return product.id;
  }

  const catalogProduct = products.find((item) => item.id === product.id);
  return catalogProduct?.apiId !== undefined ? String(catalogProduct.apiId) : product.id;
};

const normalizePaymentMethodId = (value: string) => value.trim().toLowerCase();

const getPreferredMethodId = (methods: PaymentMethod[]) =>
  methods.find((method) => normalizePaymentMethodId(method.id) === "mpesa")?.id ??
  methods[0]?.id ??
  "";

const prioritizePaymentMethods = (methods: PaymentMethod[]) => {
  const seen = new Set<string>();
  const orderedIds = ["mpesa", "airtel", "airtel_money", "card", "bank_transfer"];

  return [...methods]
    .filter((method) => {
      const key = normalizePaymentMethodId(method.id || method.name);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftIndex = orderedIds.indexOf(normalizePaymentMethodId(left.id));
      const rightIndex = orderedIds.indexOf(normalizePaymentMethodId(right.id));

      if (leftIndex === -1 && rightIndex === -1) {
        return left.name.localeCompare(right.name);
      }

      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });
};

const getFallbackMethods = (): PaymentMethod[] =>
  prioritizePaymentMethods([
    {
      id: "mpesa",
      name: "M-Pesa",
      type: "mobile_money",
      description: "Pay via mobile money (recommended in Kenya)",
      logo: paymentLogos.mpesa,
    },
    {
      id: "airtel_money",
      name: "Airtel Money",
      type: "mobile_money",
      description: "Alternative mobile wallet payment",
      logo: paymentLogos.airtel_money,
    },
    {
      id: "card",
      name: "Card Payment",
      type: "card",
      description: "Visa or Mastercard",
      logo: paymentLogos.card,
    },
  ]);

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isTransientMpesaStatusError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes("Failed to query M-Pesa payment status") ||
    error.message.includes("500.001.1001") ||
    error.message.includes("405") ||
    error.message.includes("404") ||
    error.message.includes("Method Not Allowed") ||
    error.message.includes("Failed to fetch"));

const getFriendlyMpesaFailureMessage = (description?: string) => {
  if (!description) return "M-Pesa payment was cancelled or failed.";
  if (description.toLowerCase().includes("user cannot be reached")) {
    return "The phone could not be reached for the M-Pesa prompt. Confirm the number is active, on, and has network, then try again.";
  }
  return description;
};

const formatMpesaFailureDetails = (payment?: { result_code?: string | number; result_desc?: string } | null) => {
  const friendly = getFriendlyMpesaFailureMessage(payment?.result_desc);
  const rawBits = [
    payment?.result_code !== undefined && payment?.result_code !== null
      ? `Code: ${payment.result_code}`
      : null,
    payment?.result_desc ? `Raw: ${payment.result_desc}` : null,
  ].filter(Boolean);

  return rawBits.length > 0 ? `${friendly} (${rawBits.join(" | ")})` : friendly;
};

const buildStructuredAddress = (county: string, area: string, deliveryPoint: string) =>
  [county.trim(), area.trim(), deliveryPoint.trim()].filter(Boolean).join(", ");

const buildStructuredCity = (deliveryCounty: string) => deliveryCounty.trim() || "Nairobi";

const getSafeStepIndex = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 0), checkoutSteps.length - 1);
};

const readStoredCheckoutDraft = (): CheckoutDraft | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CheckoutDraft) : null;
  } catch (error) {
    console.error("Failed to read stored checkout draft:", error);
    return null;
  }
};

const clearStoredCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
};

const sanitizePhoneInput = (value: string) =>
  value
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 13);

const isValidKenyanMobileNumber = (value: string) => {
  const cleaned = value.trim();

  if (!cleaned) {
    return false;
  }

  if (cleaned.startsWith("+")) {
    return /^\+254(7|1)\d{8}$/.test(cleaned);
  }

  return /^(0(7|1)\d{8}|254(7|1)\d{8})$/.test(cleaned);
};

const normalizePhoneNumberForPayload = (value: string) => {
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

const getPaymentMethodType = (method: PaymentMethod | null): "mobile" | "card" | "bank" | null => {
  if (!method) {
    return null;
  }

  const normalizedId = normalizePaymentMethodId(method.id);
  const normalizedType = normalizePaymentMethodId(method.type);
  const normalizedName = normalizePaymentMethodId(method.name);

  if (
    normalizedType === "card" ||
    normalizedId.includes("card") ||
    normalizedName.includes("visa") ||
    normalizedName.includes("mastercard")
  ) {
    return "card";
  }

  if (normalizedType === "bank_transfer" || normalizedId.includes("bank")) {
    return "bank";
  }

  return "mobile";
};

const Checkout = () => {
  const {
    items,
    total,
    clearCart,
    deliverySelection,
    setDeliveryZone,
    setDeliveryCounty,
    setDeliveryArea,
    setDeliveryPoint,
    setDeliveryMethod,
    shippingFee,
    grandTotal,
    promoSummary,
    promoLoading,
    promoError,
    discountAmount,
    shippingDiscount,
    applyPromoCode,
    removePromoCode,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialDraft] = useState<CheckoutDraft | null>(() => readStoredCheckoutDraft());
  const activeDeliveryZone = getDeliveryZone(deliverySelection.zone);

  const [currentStep, setCurrentStep] = useState(() => getSafeStepIndex(initialDraft?.currentStep));
  const [paymentMethod, setPaymentMethod] = useState(initialDraft?.paymentMethod || "");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [promoCode, setPromoCode] = useState(promoSummary?.code || "");
  const [paymentDetails, setPaymentDetails] = useState({
    phoneNumber: initialDraft?.paymentDetails?.phoneNumber || "",
    bankName: initialDraft?.paymentDetails?.bankName || "",
  });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentSelectionError, setPaymentSelectionError] = useState<string | null>(null);
  const [showDeliveryErrors, setShowDeliveryErrors] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialDraft?.formData?.fullName || "",
    email: initialDraft?.formData?.email || "",
    phone: initialDraft?.formData?.phone || "",
  });

  const deliveryErrors = showDeliveryErrors ? getDeliveryFieldErrors(deliverySelection) : {};
  const selectedPaymentMethod =
    paymentMethods.find((method) => normalizePaymentMethodId(method.id) === normalizePaymentMethodId(paymentMethod)) ||
    null;
  const paymentMethodType = getPaymentMethodType(selectedPaymentMethod);
  const normalizedPaymentMethod = normalizePaymentMethodId(paymentMethod);
  const structuredAddress = buildStructuredAddress(
    deliverySelection.zone === "nairobi" ? "Nairobi" : deliverySelection.county,
    deliverySelection.area,
    deliverySelection.point,
  );
  const structuredCity = buildStructuredCity(
    deliverySelection.zone === "nairobi" ? "Nairobi" : deliverySelection.county,
  );
  const stepConfig = checkoutSteps[currentStep];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSavings = discountAmount + shippingDiscount;
  const progressPercentage = ((currentStep + 1) / checkoutSteps.length) * 100;

  useEffect(() => {
    setPromoCode(promoSummary?.code || "");
  }, [promoSummary?.code]);

  useEffect(() => {
    setFormData((prev) => ({
      fullName: prev.fullName || user?.name || "",
      email: prev.email || user?.email || "",
      phone: prev.phone || user?.phone || "",
    }));
    setPaymentDetails((prev) => ({
      ...prev,
      phoneNumber: prev.phoneNumber || user?.phone || "",
    }));
  }, [user?.email, user?.name, user?.phone]);

  useEffect(() => {
    const draft: CheckoutDraft = {
      currentStep,
      paymentMethod,
      paymentDetails,
      formData,
    };

    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
  }, [currentStep, formData, paymentDetails, paymentMethod]);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const fallbackMethods = getFallbackMethods();
      setPaymentMethods(fallbackMethods);

      try {
        setPaymentMethodsLoading(true);
        const response = await paymentAPI.getByCountry(country);
        const methodsRaw = Array.isArray(response)
          ? response
          : response?.methods || response?.payment_methods || [];
        const methods = prioritizePaymentMethods(
          methodsRaw
            .map((method: { id?: string; code?: string; name?: string; type?: string; description?: string; logo?: string }) => ({
              id: method.id || method.code || method.name?.toLowerCase().replace(/\s+/g, "_"),
              name: method.name,
              type: method.type || method.code || "mobile_money",
              description: method.description || "Secure payment option",
              logo: method.logo || paymentLogos[method.id || method.code || ""],
            }))
            .filter((method: PaymentMethod) => Boolean(method.id && method.name)),
        );

        const nextMethods = methods.length > 0 ? methods : fallbackMethods;
        setPaymentMethods(nextMethods);
        setPaymentMethod((current) => {
          if (
            current &&
            nextMethods.some(
              (method) =>
                normalizePaymentMethodId(method.id) === normalizePaymentMethodId(current),
            )
          ) {
            return current;
          }

          return getPreferredMethodId(nextMethods);
        });
      } catch (error) {
        if (!isApiOfflineError(error)) {
          console.error("Failed to fetch payment methods:", error);
        }

        setPaymentMethod((current) => {
          if (
            current &&
            fallbackMethods.some(
              (method) =>
                normalizePaymentMethodId(method.id) === normalizePaymentMethodId(current),
            )
          ) {
            return current;
          }

          return getPreferredMethodId(fallbackMethods);
        });
      } finally {
        setPaymentMethodsLoading(false);
      }
    };

    void fetchPaymentMethods();
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePaymentInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: name === "phoneNumber" ? sanitizePhoneInput(value) : value,
    }));
  };

  const validateAddressStep = () => {
    const deliveryError = getFirstDeliveryError(deliverySelection);
    if (deliveryError) {
      setShowDeliveryErrors(true);
      toast({
        title: "Delivery details needed",
        description: deliveryError,
        variant: "destructive",
      });
      return false;
    }

    if (!formData.fullName.trim()) {
      toast({
        title: "Missing information",
        description: "Full name is required before continuing.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Missing information",
        description: "Phone number is required before continuing.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Missing information",
        description: "Email is required before continuing.",
        variant: "destructive",
      });
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      toast({
        title: "Check your email",
        description: "Enter a valid email address before continuing.",
        variant: "destructive",
      });
      return false;
    }

    setShowDeliveryErrors(false);
    return true;
  };

  const validatePaymentStep = () => {
    if (!paymentMethod) {
      setPaymentSelectionError("Select a payment method before continuing.");
      return false;
    }

    if (normalizedPaymentMethod === "mpesa") {
      if (!paymentDetails.phoneNumber.trim()) {
        toast({
          title: "M-Pesa number needed",
          description: "Enter the phone number that should receive the STK push.",
          variant: "destructive",
        });
        return false;
      }

      if (!isValidKenyanMobileNumber(paymentDetails.phoneNumber)) {
        toast({
          title: "Check the M-Pesa number",
          description: "Use a valid Kenyan mobile number such as 07XXXXXXXX or 2547XXXXXXXX.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (paymentMethodType === "bank" && !paymentDetails.bankName.trim()) {
      toast({
        title: "Bank selection needed",
        description: "Choose your bank before placing the order.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      return validateAddressStep();
    }

    if (stepIndex === 2) {
      return validatePaymentStep();
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, checkoutSteps.length - 1));
  };

  const handleStepSelect = (stepIndex: number) => {
    if (stepIndex === currentStep) {
      return;
    }

    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      return;
    }

    for (let index = currentStep; index < stepIndex; index += 1) {
      if (!validateStep(index)) {
        return;
      }
    }

    setCurrentStep(stepIndex);
  };

  const handleApplyPromoCode = async () => {
    try {
      const applied = await applyPromoCode(promoCode);
      toast({
        title: "Promo applied",
        description: applied.message || `${applied.code} has been added to your order.`,
      });
    } catch (error) {
      toast({
        title: "Promo unavailable",
        description: error instanceof Error ? error.message : "Failed to apply promo code",
        variant: "destructive",
      });
    }
  };

  const handleRemovePromoCode = async () => {
    await removePromoCode();
    setPromoCode("");
    toast({
      title: "Promo removed",
      description: "Your checkout totals have been refreshed.",
    });
  };

  const handleSelectPaymentMethod = (methodId: string) => {
    setPaymentMethod(methodId);
    setPaymentSelectionError(null);
    setPaymentMessage("");
  };

  const handleSubmit = async () => {
    if (!validateAddressStep() || !validatePaymentStep()) {
      return;
    }

    try {
      setSubmittingOrder(true);
      if (normalizedPaymentMethod === "mpesa") {
        setPaymentMessage("Sending payment request...");
      } else {
        setPaymentMessage("");
      }

      const orderPayload = {
        items: items.map((item) => ({
          product_id: getBackendProductId(item.product),
          product_name: item.product.name,
          quantity: item.quantity,
          price_per_item_kes: item.product.price,
          item_total_kes: item.product.price * item.quantity,
        })),
        totals: {
          currency: "KES",
          subtotal_kes: total,
          shipping_kes: shippingFee,
          grand_total_kes: grandTotal,
        },
        promo_code: promoSummary?.code || undefined,
        shipping_address: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: structuredAddress,
          city: structuredCity,
          postal_code: "",
          country,
          county: deliverySelection.zone === "nairobi" ? "Nairobi" : deliverySelection.county,
          area: deliverySelection.area,
          delivery_zone: activeDeliveryZone.label,
          delivery_zone_code: deliverySelection.zone,
          delivery_point: deliverySelection.point,
          delivery_method: deliverySelection.method,
          delivery_eta: deliverySelection.eta,
        },
        payment_method: paymentMethod,
        payment_details: {
          type: paymentMethodType,
          phone_number:
            normalizedPaymentMethod === "mpesa"
              ? normalizePhoneNumberForPayload(paymentDetails.phoneNumber)
              : undefined,
          bank_name: paymentMethodType === "bank" ? paymentDetails.bankName : undefined,
        },
        delivery: {
          county: deliverySelection.zone === "nairobi" ? "Nairobi" : deliverySelection.county,
          area: deliverySelection.area,
          point: deliverySelection.point,
          delivery_point: deliverySelection.point,
          delivery_zone: activeDeliveryZone.label,
          delivery_zone_code: deliverySelection.zone,
          method: deliverySelection.method,
          shipping_fee: shippingFee,
          eta: deliverySelection.eta,
        },
      };

      const response = await ordersAPI.create(orderPayload);

      if (normalizedPaymentMethod === "mpesa") {
        const orderId = response?.order_id;
        const customerMessage =
          response?.message ||
          response?.payment?.customer_message ||
          "Check your phone and complete the M-Pesa prompt to finish payment.";

        setPaymentMessage(customerMessage);
        toast({
          title: "STK push sent",
          description: customerMessage,
        });

        if (!orderId) {
          throw new Error("Order reference missing after M-Pesa initiation.");
        }

        const MAX_POLLS = 24;
        const POLL_INTERVAL_MS = 5000;

        for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
          await wait(POLL_INTERVAL_MS);

          let statusResponse;
          try {
            statusResponse = await paymentAPI.getMpesaStatus(orderId, {
              email: formData.email.trim(),
              phone: paymentDetails.phoneNumber.trim() || formData.phone.trim(),
            });
          } catch (error) {
            if (isTransientMpesaStatusError(error)) {
              continue;
            }
            throw error;
          }

          const payment = statusResponse?.payment;
          const paymentStatus = payment?.payment_status;
          const successMessage =
            payment?.customer_message ||
            statusResponse?.message ||
            `Payment confirmed. Your order ${orderId} was placed successfully.`;

          setPaymentMessage(
            paymentStatus === "paid"
              ? successMessage
              : `M-Pesa prompt sent to phone. Enter your PIN to complete Order #${orderId} (checking status...)`
          );

          if (paymentStatus === "paid") {
            clearStoredCheckoutDraft();
            toast({
              title: "Order successful",
              description: successMessage,
            });
            clearCart();
            setTimeout(() => navigate("/shop"), 2000);
            return;
          }

          if (paymentStatus === "failed") {
            throw new Error(formatMpesaFailureDetails(payment));
          }
        }

        // When polling completes while order is already saved in database
        clearStoredCheckoutDraft();
        clearCart();
        toast({
          title: `Order Received (#${orderId})`,
          description: "Your order has been recorded. Once your M-Pesa PIN is entered, payment confirmation will update automatically.",
        });
        setTimeout(() => navigate("/shop"), 2500);
        return;
      }

      clearStoredCheckoutDraft();
      toast({
        title: "Order placed successfully",
        description: `Your order of ${formatCurrency(grandTotal)} has been received.`,
      });
      clearCart();
      setTimeout(() => navigate("/shop"), 1600);
    } catch (error) {
      console.error("Order submission failed:", error);
      toast({
        title: "Order failed",
        description: isApiOfflineError(error)
          ? "We couldn't reach the payment service to confirm your order. Please refresh and try again. If you already approved the M-Pesa prompt, wait a moment and check your order status before retrying."
          : error instanceof Error
            ? error.message
            : "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const renderPaymentSetupStep = () => {
    const showMpesaForm = normalizedPaymentMethod === "mpesa";
    const showBankForm = paymentMethodType === "bank";
    const showCardSummary = paymentMethodType === "card";
    const showAirtelSummary = normalizedPaymentMethod.includes("airtel");

    return (
      <div className="space-y-6">
        <PaymentMethodSelector
          methods={paymentMethods}
          selectedMethodId={paymentMethod}
          loading={paymentMethodsLoading}
          selectionError={paymentSelectionError}
          onSelect={handleSelectPaymentMethod}
        />

        <section className="rounded-[30px] border border-primary/10 bg-card px-5 py-6 shadow-[0_22px_48px_rgba(32,24,17,0.06)] sm:px-8 sm:py-8">
          <div className="border-b border-border/80 pb-5">
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">
              Payment Details
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Keep this step short and simple. Add only the detail needed for the method you chose,
              then move straight to review.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.95fr)]">
            <div className="space-y-4">
              {showMpesaForm ? (
                <div className="rounded-[24px] border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-foreground/80">
                      M-Pesa Number
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Enter the Safaricom number that should receive the STK push right after you tap
                    pay.
                  </p>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-body text-foreground">
                      M-Pesa Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={paymentDetails.phoneNumber}
                      onChange={handlePaymentInputChange}
                      placeholder="07XXXXXXXX"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none transition-colors focus:border-primary"
                    />
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      We will use this number for the payment prompt and for payment verification.
                    </p>
                  </div>
                </div>
              ) : showBankForm ? (
                <div className="rounded-[24px] border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-foreground/80">
                      Bank Details
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Choose the bank you plan to use so the final instructions are matched
                    correctly.
                  </p>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-body text-foreground">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={paymentDetails.bankName}
                      onChange={handlePaymentInputChange}
                      placeholder="Equity Bank"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-primary/12 bg-secondary/10 p-5">
                  <div className="flex items-center gap-2">
                    {showCardSummary ? (
                      <CreditCard className="h-4 w-4 text-primary" />
                    ) : showAirtelSummary ? (
                      <Smartphone className="h-4 w-4 text-primary" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    )}
                    <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-primary/80">
                      What happens next
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {showCardSummary
                      ? "After the final review, we will guide you into the secure card-payment step."
                      : showAirtelSummary
                        ? "After confirmation, we will use your checkout contact details to guide the Airtel Money payment step."
                        : "Complete the last review step and we will guide the selected payment flow from there."}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-primary/12 bg-secondary/10 p-5">
              <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-primary/80">
                Payment Snapshot
              </p>
              <h3 className="mt-3 font-display text-2xl text-foreground">
                {selectedPaymentMethod?.name || "Choose a method"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The final review will summarize this payment choice together with your address,
                delivery method, and total.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <p className="text-xs font-body uppercase tracking-[0.18em] text-muted-foreground">
                    Checkout Contact
                  </p>
                  <p className="mt-2 text-sm font-body font-semibold text-foreground">
                    {formData.fullName || "Name pending"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formData.phone || "Phone pending"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formData.email || "Email pending"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <p className="text-xs font-body uppercase tracking-[0.18em] text-muted-foreground">
                    Delivery Total
                  </p>
                  <p className="mt-2 text-lg font-body font-semibold text-foreground">
                    {formatCurrency(grandTotal)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Includes shipping fee of {formatCurrency(shippingFee)}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <CheckoutAddressStep
          formData={formData}
          deliverySelection={deliverySelection}
          activeZone={activeDeliveryZone}
          errors={deliveryErrors}
          onInputChange={handleInputChange}
          onSetDeliveryZone={setDeliveryZone}
          onSetDeliveryCounty={setDeliveryCounty}
          onSetDeliveryArea={setDeliveryArea}
          onSetDeliveryPoint={setDeliveryPoint}
        />
      );
    }

    if (currentStep === 1) {
      return (
        <CheckoutDeliveryMethodStep
          deliverySelection={deliverySelection}
          activeZone={activeDeliveryZone}
          shippingFee={shippingFee}
          onSelectMethod={setDeliveryMethod}
        />
      );
    }

    if (currentStep === 2) {
      return renderPaymentSetupStep();
    }

    return (
      <CheckoutReviewStep
        formData={formData}
        deliverySelection={deliverySelection}
        activeZone={activeDeliveryZone}
        paymentMethodLabel={selectedPaymentMethod?.name || "Payment method"}
        paymentMethodType={paymentMethodType}
        paymentMethodId={normalizedPaymentMethod}
        paymentDetails={paymentDetails}
        shippingFee={shippingFee}
        paymentMessage={paymentMessage}
        submittingOrder={submittingOrder}
        onSubmit={handleSubmit}
      />
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f8f5ef] pb-20 pt-32">
        <SEO
          title="Checkout"
          description="Complete your Queen Koba order."
          path="/checkout"
          robots="noindex,nofollow"
        />
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl">Your cart is empty</h1>
          <button
            onClick={() => navigate("/shop")}
            className="inline-flex items-center gap-2 rounded-sm bg-gold-gradient px-6 py-3 text-sm font-body font-semibold uppercase tracking-widest text-primary-foreground"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5ef] pb-20 pt-24">
      <SEO
        title="Checkout"
        description="Secure checkout for Queen Koba skincare orders."
        path="/checkout"
        robots="noindex,nofollow"
      />

      <div className="container mx-auto max-w-7xl overflow-x-hidden px-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-body text-sm uppercase tracking-wide">Back</span>
        </button>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffaf3_0%,#f7efe2_100%)] px-6 py-8 shadow-[0_20px_50px_rgba(45,30,12,0.06)] md:px-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-body font-semibold uppercase tracking-[0.3em] text-primary/80">
                  Guided checkout
                </p>
                <h1 className="mt-3 font-display text-4xl font-light leading-tight md:text-5xl">
                  Checkout at your pace
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/76 md:text-base">
                  We have broken your order into four short steps so you can move from address to
                  payment without one long, tiring form.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <span className="rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-primary">
                  4 simple steps
                </span>
                <span className="rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-primary">
                  Secure payment
                </span>
                <span className="rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-primary">
                  Kenya delivery
                </span>
              </div>
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {checkoutSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isComplete = index < currentStep;
                  const isReachable = index <= currentStep;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleStepSelect(index)}
                      disabled={!isReachable}
                      aria-current={isActive ? "step" : undefined}
                      className={`rounded-[24px] border px-4 py-4 text-left transition-all ${
                        isActive
                          ? "border-primary bg-white shadow-[0_18px_34px_rgba(95,74,43,0.12)]"
                          : isComplete
                            ? "border-primary/20 bg-white/80 hover:border-primary/35"
                            : "border-white/60 bg-white/55 text-foreground/70"
                      } ${!isReachable ? "cursor-not-allowed opacity-75" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : isComplete
                                ? "bg-primary/10 text-primary"
                                : "bg-white text-muted-foreground"
                          }`}
                        >
                          {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-primary/80">
                            Step {index + 1}
                          </p>
                          <p className="mt-2 font-display text-xl text-foreground">{step.label}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {step.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)] lg:gap-8">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-primary/10 bg-white px-5 py-5 shadow-[0_22px_48px_rgba(32,24,17,0.06)] sm:px-8">
                <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Step {currentStep + 1} of {checkoutSteps.length}
                </p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="font-display text-3xl text-foreground">{stepConfig.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                      {stepConfig.description}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-primary/12 bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                    {itemCount} item{itemCount === 1 ? "" : "s"} in your order
                  </div>
                </div>
              </div>

              <motion.div
                key={stepConfig.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {renderCurrentStep()}
              </motion.div>

              {currentStep < checkoutSteps.length - 1 && (
                <div className="flex flex-col-reverse gap-3 rounded-[28px] border border-primary/10 bg-white px-5 py-5 shadow-[0_22px_48px_rgba(32,24,17,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 0) {
                        navigate(-1);
                        return;
                      }

                      setCurrentStep((prev) => Math.max(prev - 1, 0));
                    }}
                    className="inline-flex items-center justify-center rounded-[18px] border border-primary/12 px-5 py-3 text-sm font-body font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/5"
                  >
                    {currentStep === 0 ? "Back" : "Previous step"}
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-6 py-3.5 text-sm font-body font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_18px_36px_rgba(95,74,43,0.18)] transition-all hover:bg-primary/90"
                  >
                    {stepConfig.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <aside className="top-24 rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-[0_22px_48px_rgba(32,24,17,0.06)] sm:p-8 lg:sticky">
                <div className="border-b border-border/80 pb-5">
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Order snapshot
                  </p>
                  <h3 className="mt-3 font-display text-2xl text-foreground">
                    Smooth, step-by-step checkout
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Your products and totals stay here while the left side focuses on just one step
                    at a time.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[22px] border border-primary/12 bg-primary/5 px-4 py-4 text-sm">
                    <p className="text-xs font-body uppercase tracking-[0.18em] text-primary/75">
                      Items
                    </p>
                    <p className="mt-2 font-display text-2xl text-foreground">{itemCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCurrency(total)} subtotal
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-primary/12 bg-primary/5 px-4 py-4 text-sm">
                    <p className="text-xs font-body uppercase tracking-[0.18em] text-primary/75">
                      Delivery
                    </p>
                    <p className="mt-2 font-display text-2xl text-foreground">
                      {formatCurrency(shippingFee)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeDeliveryZone.label}</p>
                  </div>

                  <div className="rounded-[22px] border border-primary/12 bg-primary/5 px-4 py-4 text-sm sm:col-span-2 lg:col-span-1">
                    <p className="text-xs font-body uppercase tracking-[0.18em] text-primary/75">
                      Final total
                    </p>
                    <p className="mt-2 font-display text-2xl text-foreground">
                      {formatCurrency(grandTotal)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {totalSavings > 0
                        ? `${formatCurrency(totalSavings)} saved so far`
                        : "Promo savings will appear here"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border border-primary/12 bg-secondary/10 px-4 py-4 text-sm">
                  <p className="font-body font-semibold uppercase tracking-[0.16em] text-foreground/80">
                    Delivery summary
                  </p>
                  <p className="mt-2 text-muted-foreground">{activeDeliveryZone.label}</p>
                  <p className="text-muted-foreground">
                    {deliverySelection.zone === "nairobi"
                      ? "Nairobi"
                      : deliverySelection.county || "County pending"}
                    {" · "}
                    {deliverySelection.area || "Area pending"}
                  </p>
                  <p className="text-muted-foreground">
                    {deliverySelection.point || "Exact delivery point pending"}
                  </p>
                  <p className="capitalize text-muted-foreground">
                    {deliverySelection.method === "door" ? "Door delivery" : "Pickup station"} ·{" "}
                    {deliverySelection.eta}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {items.slice(0, currentStep === checkoutSteps.length - 1 ? items.length : 2).map((item) => (
                    <div
                      key={item.product.id}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border/50 pb-4 sm:gap-4"
                    >
                      <div className="overflow-hidden rounded-[18px] bg-secondary/20">
                        {item.product.image ? (
                          <AdaptiveImage
                            src={item.product.image}
                            alt={item.product.name}
                            className="aspect-square w-full object-cover object-center"
                            sizes="72px"
                          />
                        ) : (
                          <div className="aspect-square w-full bg-secondary/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-sm font-semibold text-foreground">
                          {item.product.name}
                        </h4>
                        <p className="mt-1 text-xs font-body text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-body font-semibold text-foreground">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {items.length > 2 && currentStep < checkoutSteps.length - 1 && (
                  <div className="mt-4 rounded-[18px] border border-dashed border-primary/15 bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                    +{items.length - 2} more item{items.length - 2 === 1 ? "" : "s"} waiting in
                    your order summary.
                  </div>
                )}

                <div className="mt-5 space-y-3 border-t border-border pt-5">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm font-body text-green-600">
                      <span>
                        Discount{promoSummary?.code ? ` (${promoSummary.code})` : ""}
                      </span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {shippingDiscount > 0 && (
                    <div className="flex justify-between text-sm font-body text-green-600">
                      <span>Shipping Discount</span>
                      <span>-{formatCurrency(shippingDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="text-primary">{formatCurrency(shippingFee)}</span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-3 font-display text-xl font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {currentStep === checkoutSteps.length - 1 ? (
                  <div className="mt-5 border-t border-border pt-5">
                    <PromoCodePanel
                      promoCode={promoCode}
                      onPromoCodeChange={(value) => setPromoCode(sanitizePromoCodeInput(value))}
                      onApply={handleApplyPromoCode}
                      onRemove={handleRemovePromoCode}
                      promoSummary={promoSummary}
                      promoLoading={promoLoading}
                      promoError={promoError}
                      totalSavingsLabel={formatCurrency(totalSavings)}
                      updatedTotalLabel={formatCurrency(grandTotal)}
                      placeholder="WELCOME10"
                    />
                  </div>
                ) : (
                  <div className="mt-5 rounded-[20px] border border-primary/12 bg-secondary/10 px-4 py-4 text-sm leading-7 text-muted-foreground">
                    Promo codes are still available. You can apply one in the final review step
                    before you pay.
                  </div>
                )}

                {currentStep === 2 && normalizedPaymentMethod === "mpesa" && paymentDetails.phoneNumber && (
                  <div className="mt-5 rounded-[20px] border border-primary/12 bg-primary/5 px-4 py-4 text-sm leading-7 text-foreground">
                    M-Pesa prompt will be sent to <span className="font-semibold">{paymentDetails.phoneNumber}</span>.
                  </div>
                )}

                <div className="mt-5 rounded-[20px] border border-primary/12 bg-secondary/10 px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Need help before you pay? Your address, delivery choice, and payment setup stay
                  saved while you move between steps.
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
