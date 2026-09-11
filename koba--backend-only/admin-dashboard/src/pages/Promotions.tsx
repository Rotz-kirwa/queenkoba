import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Calendar, Edit, Percent, Plus, Tag, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatNairobiDate, formatNairobiDateTime } from '../lib/datetime';

type PromotionUsageRecord = {
  _id: string;
  order_id: string;
  order_reference?: string | null;
  discount_amount: number;
  shipping_discount: number;
  final_total_kes: number;
  subtotal_kes: number;
  used_at?: string | null;
};

type PromotionRecord = {
  _id: string;
  id?: string;
  code: string;
  description?: string;
  internal_notes?: string;
  campaign_type?: string;
  discount: number;
  discount_value?: number;
  type: 'percentage' | 'fixed' | 'free_shipping';
  discount_type?: 'percentage' | 'fixed' | 'free_shipping';
  status: 'active' | 'inactive';
  uses: number;
  total_uses?: number;
  limit?: number | null;
  usage_limit?: number | null;
  remaining_uses?: number | null;
  per_user_limit?: number | null;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  first_order_only?: boolean;
  starts_at?: string | null;
  expires?: string | null;
  applies_to_type?: 'all' | 'products' | 'categories';
  product_ids?: string[];
  categories?: string[];
  total_discount_given?: number;
  revenue_influenced?: number;
  orders_using_code?: PromotionUsageRecord[];
};

type PromotionFormState = {
  code: string;
  codePrefix: string;
  description: string;
  internalNotes: string;
  campaignType: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  discountValue: string;
  usageLimit: string;
  perUserLimit: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  startsAt: string;
  expires: string;
  firstOrderOnly: boolean;
  isActive: boolean;
  appliesToType: 'all' | 'products' | 'categories';
  selectedProductIds: string[];
  selectedCategories: string[];
};

type ProductOption = {
  _id: string;
  id?: string;
  name: string;
  category?: string;
};

const INITIAL_PROMO_FORM: PromotionFormState = {
  code: '',
  codePrefix: 'QK',
  description: '',
  internalNotes: '',
  campaignType: '',
  discountType: 'percentage',
  discountValue: '',
  usageLimit: '',
  perUserLimit: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  startsAt: '',
  expires: '',
  firstOrderOnly: false,
  isActive: true,
  appliesToType: 'all',
  selectedProductIds: [],
  selectedCategories: [],
};

function sanitizePromoCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildPromoPrefix(source: string) {
  const normalized = sanitizePromoCode(source);
  return normalized.slice(0, 8) || 'QK';
}

function formatPromotionDiscount(promo: PromotionRecord) {
  if (promo.type === 'free_shipping') return 'Free Shipping';
  if (promo.type === 'fixed') return `KSh ${Number(promo.discount || 0).toLocaleString()}`;
  return `${Number(promo.discount || 0).toLocaleString()}%`;
}

function formatCategoryLabel(category: string) {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function mapPromotionToForm(promo: PromotionRecord): PromotionFormState {
  return {
    code: promo.code,
    codePrefix: buildPromoPrefix(promo.code || 'QK'),
    description: promo.description || '',
    internalNotes: promo.internal_notes || '',
    campaignType: promo.campaign_type || '',
    discountType: promo.type,
    discountValue: promo.type === 'free_shipping' ? '' : String(promo.discount ?? promo.discount_value ?? ''),
    usageLimit: promo.limit ? String(promo.limit) : '',
    perUserLimit: promo.per_user_limit ? String(promo.per_user_limit) : '',
    minOrderAmount: promo.min_order_amount ? String(promo.min_order_amount) : '',
    maxDiscountAmount: promo.max_discount_amount ? String(promo.max_discount_amount) : '',
    startsAt: toDateInputValue(promo.starts_at),
    expires: toDateInputValue(promo.expires),
    firstOrderOnly: Boolean(promo.first_order_only),
    isActive: promo.status === 'active',
    appliesToType: promo.applies_to_type || 'all',
    selectedProductIds: (promo.product_ids || []).map(String),
    selectedCategories: promo.categories || [],
  };
}

function getFormValidationError(form: PromotionFormState) {
  if (!form.description.trim()) return 'Promotion description is required.';
  if (!form.code.trim()) return 'Promo code is required.';

  if (form.discountType !== 'free_shipping') {
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
      return 'Enter a valid discount value.';
    }
    if (form.discountType === 'percentage' && discountValue > 100) {
      return 'Percentage discounts cannot exceed 100%.';
    }
  }

  if (form.appliesToType === 'products' && form.selectedProductIds.length === 0) {
    return 'Select at least one product for a product-specific promotion.';
  }

  if (form.appliesToType === 'categories' && form.selectedCategories.length === 0) {
    return 'Select at least one category for a category-specific promotion.';
  }

  if (form.startsAt && form.expires && new Date(form.expires) <= new Date(form.startsAt)) {
    return 'Expiry date must be after the start date.';
  }

  return '';
}

function buildPromotionPayload(form: PromotionFormState) {
  return {
    code: sanitizePromoCode(form.code),
    description: form.description.trim(),
    internal_notes: form.internalNotes.trim(),
    campaign_type: form.campaignType.trim(),
    discount_type: form.discountType,
    discount_value: form.discountType === 'free_shipping' ? 0 : Number(form.discountValue),
    usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
    per_user_limit: form.perUserLimit ? Number(form.perUserLimit) : null,
    min_order_amount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
    max_discount_amount:
      form.discountType === 'percentage' && form.maxDiscountAmount
        ? Number(form.maxDiscountAmount)
        : null,
    starts_at: form.startsAt || null,
    expires: form.expires || null,
    first_order_only: form.firstOrderOnly,
    is_active: form.isActive,
    applies_to_type: form.appliesToType,
    product_ids: form.appliesToType === 'products' ? form.selectedProductIds.map(Number) : [],
    categories: form.appliesToType === 'categories' ? form.selectedCategories : [],
  };
}

function getPromotionLifecycle(promo: PromotionRecord) {
  const now = Date.now();
  const startsAt = promo.starts_at ? new Date(promo.starts_at).getTime() : null;
  const expiresAt = promo.expires ? new Date(promo.expires).getTime() : null;

  if (promo.status !== 'active') {
    return { label: 'Inactive', classes: 'bg-gray-100 text-gray-700' };
  }

  if (startsAt && startsAt > now) {
    return { label: 'Scheduled', classes: 'bg-amber-100 text-amber-800' };
  }

  if (expiresAt && expiresAt < now) {
    return { label: 'Expired', classes: 'bg-red-100 text-red-700' };
  }

  return { label: 'Active', classes: 'bg-green-100 text-green-800' };
}

export default function Promotions() {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [pageActionError, setPageActionError] = useState('');
  const [formError, setFormError] = useState('');
  const [promoForm, setPromoForm] = useState<PromotionFormState>(INITIAL_PROMO_FORM);
  const [generatingCode, setGeneratingCode] = useState(false);

  const { data: promotionsData, isLoading: promotionsLoading, error: promotionsError } = useQuery({
    queryKey: ['promotions'],
    queryFn: api.getPromotions,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['promotion-product-options'],
    queryFn: api.getProducts,
  });

  const promotions = (promotionsData?.promotions || []) as PromotionRecord[];
  const products = (productsData?.products || []) as ProductOption[];
  const selectedPromotion = promotions.find((promo) => promo._id === selectedPromotionId) || null;

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category || '')
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const productLookup = useMemo(
    () =>
      products.reduce<Record<string, ProductOption>>((acc, product) => {
        acc[String(product._id || product.id || '')] = product;
        return acc;
      }, {}),
    [products],
  );

  const pageError =
    promotionsError instanceof Error ? promotionsError.message : '';

  const openCreateModal = () => {
    setEditingPromotion(null);
    setPromoForm(INITIAL_PROMO_FORM);
    setFormError('');
    setPageActionError('');
    setShowEditor(true);
  };

  const openEditModal = (promo: PromotionRecord) => {
    setEditingPromotion(promo);
    setPromoForm(mapPromotionToForm(promo));
    setFormError('');
    setPageActionError('');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingPromotion(null);
    setPromoForm(INITIAL_PROMO_FORM);
    setFormError('');
  };

  const refreshPromotions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['promotions'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setPageActionError('');
      const validationError = getFormValidationError(promoForm);
      if (validationError) {
        throw new Error(validationError);
      }

      const payload = buildPromotionPayload(promoForm);
      if (editingPromotion?._id) {
        return api.updatePromotion(editingPromotion._id, payload);
      }

      return api.createPromotion(payload);
    },
    onSuccess: async () => {
      await refreshPromotions();
      closeEditor();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Failed to save promotion');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (promo: PromotionRecord) => api.deletePromotion(promo._id),
    onSuccess: async () => {
      setPageActionError('');
      await refreshPromotions();
    },
    onError: (error) => {
      setPageActionError(error instanceof Error ? error.message : 'Failed to delete promotion');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (promo: PromotionRecord) =>
      api.updatePromotionStatus(
        promo._id,
        promo.status === 'active' ? 'inactive' : 'active',
      ),
    onSuccess: async () => {
      setPageActionError('');
      await refreshPromotions();
    },
    onError: (error) => {
      setPageActionError(error instanceof Error ? error.message : 'Failed to update promotion status');
    },
  });

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    setFormError('');

    try {
      const prefix = buildPromoPrefix(promoForm.codePrefix || promoForm.description || 'QK');
      const response = await api.generatePromotionCode(prefix, 8);
      setPromoForm((current) => ({
        ...current,
        code: sanitizePromoCode(response?.code || ''),
        codePrefix: prefix,
      }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to generate promo code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleDelete = async (promo: PromotionRecord) => {
    if (!confirm(`Delete or deactivate ${promo.code}?`)) return;
    await deleteMutation.mutateAsync(promo);
  };

  const activePromotions = promotions.filter((promo) => promo.status === 'active').length;
  const totalUses = promotions.reduce(
    (sum, promo) => sum + Number(promo.total_uses ?? promo.uses ?? 0),
    0,
  );
  const expiringSoon = promotions.filter((promo) => {
    if (!promo.expires) return false;
    const expiresAt = new Date(promo.expires).getTime();
    const inThirtyDays = Date.now() + 1000 * 60 * 60 * 24 * 30;
    return expiresAt > Date.now() && expiresAt <= inThirtyDays;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Promotions & Discounts</h1>
          <p className="mt-1 text-gray-500">
            Create, edit, and track promo codes from campaign setup to customer redemption.
          </p>
        </div>
        <button onClick={openCreateModal} className="admin-btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Promotion
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Active Promotions</span>
            <Tag className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold">{activePromotions}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Uses</span>
            <Percent className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{totalUses}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Expiring Soon</span>
            <Calendar className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold">{expiringSoon}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        {(pageError || pageActionError) && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || pageActionError}
          </div>
        )}

        {promotionsLoading ? (
          <div className="py-12 text-center">Loading promotions...</div>
        ) : promotions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No promo codes yet. Create one to start your next campaign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Promotion</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Benefit</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rules</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Usage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => {
                  const lifecycle = getPromotionLifecycle(promo);
                  const productNames = (promo.product_ids || [])
                    .map((id) => productLookup[String(id)]?.name)
                    .filter(Boolean);

                  return (
                    <tr
                      key={promo._id}
                      className="border-b border-gray-100 align-top hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono font-semibold tracking-wide">{promo.code}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {promo.description || 'Untitled promotion'}
                        </p>
                        {promo.campaign_type && (
                          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                            {promo.campaign_type}
                          </p>
                        )}
                        {promo.internal_notes && (
                          <p className="mt-2 text-xs text-gray-500">{promo.internal_notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{formatPromotionDiscount(promo)}</p>
                        {Number(promo.min_order_amount || 0) > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            Minimum order: KSh {Number(promo.min_order_amount).toLocaleString()}
                          </p>
                        )}
                        {promo.max_discount_amount !== null &&
                          promo.max_discount_amount !== undefined &&
                          promo.type === 'percentage' && (
                            <p className="mt-1 text-xs text-gray-500">
                              Discount cap: KSh {Number(promo.max_discount_amount).toLocaleString()}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <p>
                          {promo.starts_at
                            ? `Starts ${formatNairobiDate(promo.starts_at)}`
                            : 'Starts immediately'}
                        </p>
                        <p className="mt-1">
                          {promo.expires ? `Ends ${formatNairobiDate(promo.expires)}` : 'No expiry'}
                        </p>
                        <p className="mt-1">
                          Applies to:{' '}
                          {promo.applies_to_type === 'products'
                            ? `${productNames.slice(0, 2).join(', ')}${productNames.length > 2 ? ` +${productNames.length - 2} more` : ''}`
                            : promo.applies_to_type === 'categories'
                              ? (promo.categories || []).map(formatCategoryLabel).join(', ')
                              : 'All products'}
                        </p>
                        {promo.first_order_only && (
                          <p className="mt-1 text-xs text-amber-700">First order only</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {promo.total_uses ?? promo.uses}
                          {promo.limit ? ` / ${promo.limit}` : ' uses'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {promo.per_user_limit
                            ? `${promo.per_user_limit} per customer`
                            : 'Unlimited per customer'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Discount given: KSh {Number(promo.total_discount_given || 0).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedPromotionId(promo._id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#8B6F47] hover:underline"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          View usage
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${lifecycle.classes}`}>
                            {lifecycle.label}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate(promo)}
                              className="text-xs text-[#8B6F47] hover:underline"
                            >
                              {promo.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(promo)}
                            className="rounded-lg p-2 hover:bg-gray-100"
                            aria-label={`Edit ${promo.code}`}
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(promo)}
                            className="rounded-lg p-2 hover:bg-gray-100"
                            aria-label={`Delete ${promo.code}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define the code, benefit, availability window, and who can use it.
                </p>
              </div>
              <button type="button" onClick={closeEditor}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Promotion Description</label>
                <input
                  type="text"
                  value={promoForm.description}
                  onChange={(event) =>
                    setPromoForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="10% off first order"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Campaign Tag</label>
                <input
                  type="text"
                  value={promoForm.campaignType}
                  onChange={(event) =>
                    setPromoForm((current) => ({ ...current, campaignType: event.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="welcome, influencer, holiday"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Promo Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        code: sanitizePromoCode(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 font-mono uppercase"
                    placeholder="WELCOME10"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="rounded-lg border border-[#8B6F47] px-4 py-2 text-sm font-medium text-[#8B6F47] hover:bg-[#8B6F47]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingCode ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Code Prefix</label>
                <input
                  type="text"
                  value={promoForm.codePrefix}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      codePrefix: buildPromoPrefix(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 uppercase"
                  placeholder="QK"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Discount Type</label>
                <select
                  value={promoForm.discountType}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      discountType: event.target.value as PromotionFormState['discountType'],
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount Discount</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>

              {promoForm.discountType !== 'free_shipping' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {promoForm.discountType === 'fixed'
                      ? 'Discount Amount (KSh)'
                      : 'Discount Percentage'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.discountValue}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder={promoForm.discountType === 'fixed' ? '500' : '15'}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                  Free shipping selected. No numeric discount value is needed.
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Total Usage Limit</label>
                <input
                  type="number"
                  min="1"
                  value={promoForm.usageLimit}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      usageLimit: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Per Customer Limit</label>
                <input
                  type="number"
                  min="1"
                  value={promoForm.perUserLimit}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      perUserLimit: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Minimum Order (KSh)</label>
                <input
                  type="number"
                  min="0"
                  value={promoForm.minOrderAmount}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      minOrderAmount: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="3000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Max Discount Cap (KSh)</label>
                <input
                  type="number"
                  min="0"
                  value={promoForm.maxDiscountAmount}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      maxDiscountAmount: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="1500"
                  disabled={promoForm.discountType !== 'percentage'}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Starts On</label>
                <input
                  type="date"
                  value={promoForm.startsAt}
                  onChange={(event) =>
                    setPromoForm((current) => ({ ...current, startsAt: event.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Expires On</label>
                <input
                  type="date"
                  value={promoForm.expires}
                  onChange={(event) =>
                    setPromoForm((current) => ({ ...current, expires: event.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Internal Notes</label>
              <textarea
                value={promoForm.internalNotes}
                onChange={(event) =>
                  setPromoForm((current) => ({ ...current, internalNotes: event.target.value }))
                }
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                placeholder="Internal notes for the marketing or support team"
              />
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Applies To</label>
                  <select
                    value={promoForm.appliesToType}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        appliesToType: event.target.value as PromotionFormState['appliesToType'],
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="all">All Products</option>
                    <option value="products">Selected Products</option>
                    <option value="categories">Selected Categories</option>
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={promoForm.firstOrderOnly}
                      onChange={(event) =>
                        setPromoForm((current) => ({
                          ...current,
                          firstOrderOnly: event.target.checked,
                        }))
                      }
                    />
                    First order only
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={promoForm.isActive}
                      onChange={(event) =>
                        setPromoForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Active immediately
                  </label>
                </div>
              </div>

              {promoForm.appliesToType === 'products' && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium">Choose Products</p>
                  {productsLoading ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                      Loading products...
                    </div>
                  ) : (
                    <div className="grid max-h-60 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 md:grid-cols-2">
                      {products.map((product) => {
                        const productId = String(product._id || product.id || '');
                        const isSelected = promoForm.selectedProductIds.includes(productId);

                        return (
                          <label
                            key={productId}
                            className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                setPromoForm((current) => ({
                                  ...current,
                                  selectedProductIds: isSelected
                                    ? current.selectedProductIds.filter((id) => id !== productId)
                                    : [...current.selectedProductIds, productId],
                                }))
                              }
                            />
                            <span>
                              <span className="block font-medium text-gray-900">{product.name}</span>
                              <span className="text-xs text-gray-500">{product.category || 'Uncategorised'}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {promoForm.appliesToType === 'categories' && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium">Choose Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((category) => {
                      const isSelected = promoForm.selectedCategories.includes(category);

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() =>
                            setPromoForm((current) => ({
                              ...current,
                              selectedCategories: isSelected
                                ? current.selectedCategories.filter((item) => item !== category)
                                : [...current.selectedCategories, category],
                            }))
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                              ? 'border-[#8B6F47] bg-[#8B6F47] text-white'
                              : 'border-gray-300 text-gray-700 hover:border-[#8B6F47]'
                          }`}
                        >
                          {formatCategoryLabel(category)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 rounded-lg bg-[#8B6F47] py-2 text-white hover:bg-[#6d5638] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending
                  ? editingPromotion
                    ? 'Saving...'
                    : 'Creating...'
                  : editingPromotion
                    ? 'Save Changes'
                    : 'Create Promotion'}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="flex-1 rounded-lg border border-gray-300 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedPromotion.code} usage</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track how often this promo has been redeemed and which orders used it.
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPromotionId(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Uses</p>
                <p className="mt-2 text-2xl font-semibold">
                  {selectedPromotion.total_uses ?? selectedPromotion.uses}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Discount Given</p>
                <p className="mt-2 text-2xl font-semibold">
                  KSh {Number(selectedPromotion.total_discount_given || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Revenue Influenced</p>
                <p className="mt-2 text-2xl font-semibold">
                  KSh {Number(selectedPromotion.revenue_influenced || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200">
              {(selectedPromotion.orders_using_code || []).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  This promo has not been used yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Order</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Used On</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Discount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Shipping Discount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Final Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPromotion.orders_using_code || []).map((usage) => (
                        <tr key={usage._id} className="border-b border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {usage.order_reference || usage.order_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {usage.used_at ? formatNairobiDateTime(usage.used_at) : 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            KSh {Number(usage.discount_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            KSh {Number(usage.shipping_discount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            KSh {Number(usage.final_total_kes || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
