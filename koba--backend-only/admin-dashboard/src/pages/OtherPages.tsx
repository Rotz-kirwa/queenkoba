import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Tag, Percent, Calendar, X, Star, CheckCircle, XCircle, MessageSquare, Shield, Edit, Lock, Bell, Database, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { formatNairobiDate, formatNairobiDateTime } from '../lib/datetime';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const getToken = () => localStorage.getItem('admin_token');

type PromotionRecord = {
  _id: string;
  id?: string;
  code: string;
  description?: string;
  campaign_type?: string;
  discount: number;
  type: 'percentage' | 'fixed' | 'free_shipping';
  status: 'active' | 'inactive';
  uses: number;
  limit?: number | null;
  per_user_limit?: number | null;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  first_order_only?: boolean;
  starts_at?: string | null;
  expires?: string | null;
};

type PromotionFormState = {
  code: string;
  codePrefix: string;
  name: string;
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
};

const INITIAL_PROMO_FORM: PromotionFormState = {
  code: '',
  codePrefix: 'QK',
  name: '',
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
};

function sanitizePromoCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildPromoPrefix(source: string) {
  const normalized = sanitizePromoCode(source);
  return normalized.slice(0, 8) || 'QK';
}

async function getResponseError(res: Response, fallback: string) {
  const raw = await res.text();
  if (!raw) return fallback;

  try {
    const data = JSON.parse(raw);
    return data?.error || data?.message || fallback;
  } catch {
    return raw;
  }
}

function formatPromotionDiscount(promo: PromotionRecord) {
  if (promo.type === 'free_shipping') return 'Free Shipping';
  if (promo.type === 'fixed') return `KSh ${Number(promo.discount || 0).toLocaleString()}`;
  return `${Number(promo.discount || 0).toLocaleString()}%`;
}

// Promotions Page
export function Promotions() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [promoForm, setPromoForm] = useState<PromotionFormState>(INITIAL_PROMO_FORM);

  useEffect(() => {
    void fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    setPageError('');

    try {
      const res = await fetch(`${API_URL}/admin/promotions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, 'Failed to load promotions'));
      }

      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load promotions';
      setPageError(message);
      console.error('Failed to fetch promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPromoForm(INITIAL_PROMO_FORM);
    setFormError('');
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    setFormError('');

    try {
      const prefix = buildPromoPrefix(promoForm.codePrefix || promoForm.name || 'QK');
      const res = await fetch(`${API_URL}/admin/promotions/generate-random`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          prefix,
          length: 8,
        }),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, 'Failed to generate promo code'));
      }

      const data = await res.json();
      setPromoForm((current) => ({
        ...current,
        code: sanitizePromoCode(data.code || ''),
        codePrefix: prefix,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate promo code';
      setFormError(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setFormError('');

    try {
      const payload = {
        code: promoForm.code,
        description: promoForm.name.trim(),
        campaign_type: promoForm.campaignType.trim(),
        discount_type: promoForm.discountType,
        discount_value: promoForm.discountType === 'free_shipping' ? 0 : Number(promoForm.discountValue),
        usage_limit: promoForm.usageLimit ? Number(promoForm.usageLimit) : null,
        per_user_limit: promoForm.perUserLimit ? Number(promoForm.perUserLimit) : null,
        min_order_amount: promoForm.minOrderAmount ? Number(promoForm.minOrderAmount) : 0,
        max_discount_amount: promoForm.maxDiscountAmount ? Number(promoForm.maxDiscountAmount) : null,
        starts_at: promoForm.startsAt || null,
        expires: promoForm.expires || null,
        first_order_only: promoForm.firstOrderOnly,
        is_active: promoForm.isActive,
      };

      const res = await fetch(`${API_URL}/admin/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, 'Failed to create promotion'));
      }

      await fetchPromotions();
      setShowModal(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create promotion';
      setFormError(message);
      console.error('Failed to create promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this promotion?')) {
      try {
        const res = await fetch(`${API_URL}/admin/promotions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (!res.ok) {
          throw new Error(await getResponseError(res, 'Failed to delete promotion'));
        }

        await fetchPromotions();
      } catch (err) {
        console.error('Failed to delete promotion:', err);
        setPageError(err instanceof Error ? err.message : 'Failed to delete promotion');
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/promotions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          status: currentStatus === 'active' ? 'inactive' : 'active',
        }),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, 'Failed to update promotion status'));
      }

      await fetchPromotions();
    } catch (err) {
      console.error('Failed to update status:', err);
      setPageError(err instanceof Error ? err.message : 'Failed to update promotion status');
    }
  };

  const activePromotions = promotions.filter((promo) => promo.status === 'active').length;
  const totalUses = promotions.reduce((sum, promo) => sum + Number(promo.uses || 0), 0);
  const expiringSoon = promotions.filter((promo) => {
    if (!promo.expires) return false;
    const expiresAt = new Date(promo.expires).getTime();
    const inThirtyDays = Date.now() + 1000 * 60 * 60 * 24 * 30;
    return expiresAt <= inThirtyDays;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Promotions & Discounts</h1>
          <p className="mt-1 text-gray-500">Generate promo codes, name campaigns, and manage discount limits.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="admin-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Promotion
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Active Promotions</span>
            <Tag className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold">{activePromotions}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Uses</span>
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{totalUses}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Expiring Soon</span>
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold">{expiringSoon}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        {pageError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">Loading promotions...</div>
        ) : promotions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No promo codes yet. Create one to start marketing campaigns.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Campaign Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Discount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Usage Limits</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Validity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo._id} className="border-b border-gray-100 align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="font-mono font-semibold tracking-wide">{promo.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{promo.description || 'Untitled promotion'}</p>
                      {promo.campaign_type && (
                        <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{promo.campaign_type}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{formatPromotionDiscount(promo)}</p>
                      {Number(promo.min_order_amount || 0) > 0 && (
                        <p className="mt-1 text-xs text-gray-500">Min order: KSh {Number(promo.min_order_amount).toLocaleString()}</p>
                      )}
                      {promo.max_discount_amount !== null && promo.max_discount_amount !== undefined && promo.type === 'percentage' && (
                        <p className="mt-1 text-xs text-gray-500">Cap: KSh {Number(promo.max_discount_amount).toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {promo.uses}
                        {promo.limit ? ` / ${promo.limit}` : ' uses'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {promo.per_user_limit ? `${promo.per_user_limit} per customer` : 'Unlimited per customer'}
                      </p>
                      {promo.first_order_only && (
                        <p className="mt-1 text-xs text-amber-700">First order only</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <p>{promo.starts_at ? `Starts ${formatNairobiDate(promo.starts_at)}` : 'Starts immediately'}</p>
                      <p className="mt-1 text-gray-500">
                        {promo.expires ? `Ends ${formatNairobiDate(promo.expires)}` : 'No expiry'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleStatus(promo._id, promo.status)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          promo.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {promo.status}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(promo._id)}
                          className="rounded-lg p-2 hover:bg-gray-100"
                          aria-label={`Delete ${promo.code}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create Promotion</h2>
                <p className="mt-1 text-sm text-gray-500">Set the campaign name, generate a code, and control how many times it can be used.</p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Campaign Name</label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="March Glow Campaign"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Campaign Tag</label>
                <input
                  type="text"
                  value={promoForm.campaignType}
                  onChange={(e) => setPromoForm({ ...promoForm, campaignType: e.target.value })}
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
                    onChange={(e) => setPromoForm({ ...promoForm, code: sanitizePromoCode(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 font-mono uppercase"
                    placeholder="MARCHGLOW15"
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
                  onChange={(e) => setPromoForm({ ...promoForm, codePrefix: buildPromoPrefix(e.target.value) })}
                  className="w-full rounded-lg border px-3 py-2 uppercase"
                  placeholder="QK"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Discount Type</label>
                <select
                  value={promoForm.discountType}
                  onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as PromotionFormState['discountType'] })}
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
                    {promoForm.discountType === 'fixed' ? 'Discount Amount (KSh)' : 'Discount Percentage'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
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
                  onChange={(e) => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
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
                  onChange={(e) => setPromoForm({ ...promoForm, perUserLimit: e.target.value })}
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
                  onChange={(e) => setPromoForm({ ...promoForm, minOrderAmount: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="1500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Max Discount Cap (KSh)</label>
                <input
                  type="number"
                  min="0"
                  value={promoForm.maxDiscountAmount}
                  onChange={(e) => setPromoForm({ ...promoForm, maxDiscountAmount: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Starts On</label>
                <input
                  type="date"
                  value={promoForm.startsAt}
                  onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Expires On</label>
                <input
                  type="date"
                  value={promoForm.expires}
                  onChange={(e) => setPromoForm({ ...promoForm, expires: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={promoForm.firstOrderOnly}
                  onChange={(e) => setPromoForm({ ...promoForm, firstOrderOnly: e.target.checked })}
                />
                First order only
              </label>

              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={promoForm.isActive}
                  onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.checked })}
                />
                Make this promo active immediately
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!promoForm.name.trim() || !promoForm.code.trim() || (promoForm.discountType !== 'free_shipping' && !promoForm.discountValue) || saving}
                className="flex-1 rounded-lg bg-[#8B6F47] py-2 text-white hover:bg-[#6d5638] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Promotion'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inventory Page
export function Inventory() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif">Inventory Management</h1>
      <div className="admin-card p-6">
        <p className="text-gray-600">Track stock levels, batches, and expiry dates</p>
      </div>
    </div>
  );
}

// Reviews Page
export function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/reviews`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setReviews(data.reviews || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/reviews/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchReviews();
    } catch (err) {
      console.error('Failed to approve review:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/reviews/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchReviews();
    } catch (err) {
      console.error('Failed to reject review:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this review?')) {
      try {
        await fetch(`${API_URL}/admin/reviews/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        fetchReviews();
      } catch (err) {
        console.error('Failed to delete review:', err);
      }
    }
  };

  const filteredReviews = reviews.filter((r: any) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = reviews.filter((r: any) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r: any) => r.status === 'approved').length;
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Reviews & UGC</h1>
        <p className="text-gray-500 mt-1">Moderate customer reviews and user-generated content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pending Reviews</span>
            <MessageSquare className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Approved Reviews</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Average Rating</span>
            <Star className="w-5 h-5 text-[#8B6F47]" />
          </div>
          <p className="text-3xl font-bold text-[#8B6F47]">{avgRating} / 5</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-[#8B6F47] text-white' : 'bg-gray-100'}`}
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
          >
            Rejected
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No reviews found</div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review: any) => (
              <div key={review._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'text-[#8B6F47] fill-[#8B6F47]' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold">{review.customer_name}</span>
                      <span className="text-xs text-gray-500">
                        {formatNairobiDate(review.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Product: {review.product_name}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        review.status === 'approved' ? 'bg-green-100 text-green-800' :
                        review.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(review._id)}
                          className="p-2 bg-green-100 hover:bg-green-200 rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4 text-green-700" />
                        </button>
                        <button
                          onClick={() => handleReject(review._id)}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded-lg"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4 text-red-700" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(review._id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Payments Page
export function Payments() {
  const formatKes = (amount?: number) => `KSh ${(amount || 0).toLocaleString()}`;
  const [filter, setFilter] = useState('all');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/payments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Failed to fetch payments');
      }
      return payload;
    },
    refetchInterval: 10000,
  });
  const payments = data?.payments || [];

  const filteredPayments = payments.filter((p: any) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'initiated'].includes(p.payment_status);
    return p.payment_status === filter;
  });

  const totalRevenue = payments
    .filter((p: any) => p.payment_status === 'paid')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const pendingPayments = payments.filter((p: any) => ['pending', 'initiated'].includes(p.payment_status)).length;
  const completedPayments = payments.filter((p: any) => p.payment_status === 'paid').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Payments & Finance</h1>
        <p className="text-gray-500 mt-1">View transactions, refunds, and financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Revenue</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{formatKes(totalRevenue)}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Completed</span>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{completedPayments}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pending</span>
            <MessageSquare className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingPayments}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-[#8B6F47] text-white' : 'bg-gray-100'}`}
          >
            All ({payments.length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg ${filter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            Paid ({completedPayments})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          >
            Pending ({pendingPayments})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg ${filter === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
          >
            Failed
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Last Update</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment: any) => (
                  <tr key={payment._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs">{payment._id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-sm">{payment.customer_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{payment.customer_email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold">{formatKes(payment.amount_kes ?? payment.amount)}</div>
                      <div className="text-xs text-gray-500">
                        Subtotal {formatKes(payment.subtotal_kes)} · Shipping {formatKes(payment.shipping_kes)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                        {payment.payment_method || 'card'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {payment.last_event?.message || 'Recorded'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatNairobiDateTime(payment.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs">{payment.order_id || 'N/A'}</span>
                      {payment.payment_receipt && (
                        <div className="text-xs text-gray-500 mt-1">Receipt: {payment.payment_receipt}</div>
                      )}
                      {payment.updated_at && (
                        <div className="text-xs text-gray-500 mt-1">Updated: {formatNairobiDateTime(payment.updated_at)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Shipping Page
export function Shipping() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [newZone, setNewZone] = useState({
    name: '',
    rate: '',
    currency: 'KES',
    delivery_days: '',
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/shipping-zones`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setZones(data.zones || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/shipping-zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: newZone.name,
          rate: Number(newZone.rate),
          currency: newZone.currency,
          delivery_days: newZone.delivery_days,
        }),
      });
      if (res.ok) {
        fetchZones();
        setShowModal(false);
        setNewZone({ name: '', rate: '', currency: 'KES', delivery_days: '' });
      }
    } catch (err) {
      console.error('Failed to create zone:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingZone) return;
    try {
      await fetch(`${API_URL}/admin/shipping-zones/${editingZone._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: editingZone.name,
          rate: Number(editingZone.rate),
          delivery_days: editingZone.delivery_days,
        }),
      });
      fetchZones();
      setEditingZone(null);
    } catch (err) {
      console.error('Failed to update zone:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this shipping zone?')) {
      try {
        await fetch(`${API_URL}/admin/shipping-zones/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        fetchZones();
      } catch (err) {
        console.error('Failed to delete zone:', err);
      }
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${API_URL}/admin/shipping-zones/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ active: !currentStatus }),
      });
      fetchZones();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const activeZones = zones.filter((z: any) => z.active).length;
  const avgDelivery = '2-4';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Shipping & Regions</h1>
          <p className="text-gray-500 mt-1">Configure shipping zones and delivery options</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="admin-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Shipping Zone
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Zones</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{activeZones}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Zones</span>
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{zones.length}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Avg Delivery</span>
            <Tag className="w-5 h-5 text-[#8B6F47]" />
          </div>
          <p className="text-3xl font-bold text-[#8B6F47]">{avgDelivery} days</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <h2 className="text-xl font-semibold mb-4">Shipping Zones</h2>
        {loading ? (
          <div className="text-center py-12">Loading shipping zones...</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-sm">Zone Name</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Shipping Rate</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Delivery Time</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone: any) => (
                <tr key={zone._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <span className="font-medium">{zone.name}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold">{zone.rate.toLocaleString()} {zone.currency}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">{zone.delivery_days} days</span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => toggleActive(zone._id, zone.active)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        zone.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {zone.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingZone(zone)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Shipping Zone</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Kenya - Nairobi"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={newZone.currency}
                  onChange={(e) => setNewZone({ ...newZone, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="BIF">BIF - Burundi Franc</option>
                  <option value="CDF">CDF - Congolese Franc</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Shipping Rate</label>
                <input
                  type="number"
                  value={newZone.rate}
                  onChange={(e) => setNewZone({ ...newZone, rate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Time</label>
                <input
                  type="text"
                  value={newZone.delivery_days}
                  onChange={(e) => setNewZone({ ...newZone, delivery_days: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1-2"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreate}
                  disabled={!newZone.name || !newZone.rate || !newZone.delivery_days}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638] disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Shipping Zone</h2>
              <button onClick={() => setEditingZone(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zone Name</label>
                <input
                  type="text"
                  value={editingZone.name}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Shipping Rate</label>
                <input
                  type="number"
                  value={editingZone.rate}
                  onChange={(e) => setEditingZone({ ...editingZone, rate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Time</label>
                <input
                  type="text"
                  value={editingZone.delivery_days}
                  onChange={(e) => setEditingZone({ ...editingZone, delivery_days: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638]"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingZone(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Content Page
export function Content() {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/content`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setContent(data.content || {});
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch content:', err);
      setLoading(false);
    }
  };

  const handleUpdate = async (section: string) => {
    try {
      await fetch(`${API_URL}/admin/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          section,
          value: editValue,
        }),
      });
      fetchContent();
      setEditing(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to update content:', err);
    }
  };

  const startEdit = (section: string, currentValue: string) => {
    setEditing(section);
    setEditValue(currentValue);
  };

  const sections = [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    { key: 'about_title', label: 'About Title', type: 'text' },
    { key: 'about_description', label: 'About Description', type: 'textarea' },
    { key: 'contact_email', label: 'Contact Email', type: 'text' },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
    { key: 'contact_whatsapp', label: 'WhatsApp Number', type: 'text' },
    { key: 'instagram_handle', label: 'Instagram Handle', type: 'text' },
    { key: 'footer_text', label: 'Footer Text', type: 'textarea' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Content Management</h1>
        <p className="text-gray-500 mt-1">Edit website content and marketing materials</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading content...</div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.key} className="admin-card p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{section.label}</h3>
                  {editing === section.key ? (
                    <div className="space-y-3">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={4}
                        />
                      ) : (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(section.key)}
                          className="px-4 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6d5638]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 mb-3">
                        {content[section.key] || 'Not set'}
                      </p>
                      <button
                        onClick={() => startEdit(section.key, content[section.key] || '')}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-card p-6">
        <h3 className="font-semibold text-lg mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#8B6F47] hover:bg-gray-50 text-left">
            <h4 className="font-semibold mb-1">Update Hero Banner</h4>
            <p className="text-sm text-gray-500">Change homepage hero section</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#8B6F47] hover:bg-gray-50 text-left">
            <h4 className="font-semibold mb-1">Edit About Section</h4>
            <p className="text-sm text-gray-500">Update brand story and mission</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#8B6F47] hover:bg-gray-50 text-left">
            <h4 className="font-semibold mb-1">Contact Information</h4>
            <p className="text-sm text-gray-500">Update contact details</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#8B6F47] hover:bg-gray-50 text-left">
            <h4 className="font-semibold mb-1">Social Media Links</h4>
            <p className="text-sm text-gray-500">Update social media handles</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// Support Page
export function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/support-tickets`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setTickets(data.tickets || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_URL}/admin/support-tickets/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
      if (viewingTicket && viewingTicket._id === id) {
        setViewingTicket({ ...viewingTicket, status });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleReply = async () => {
    if (!viewingTicket || !reply.trim()) return;
    try {
      await fetch(`${API_URL}/admin/support-tickets/${viewingTicket._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: reply }),
      });
      setReply('');
      fetchTickets();
      // Refresh ticket details
      const res = await fetch(`${API_URL}/admin/support-tickets/${viewingTicket._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setViewingTicket(data.ticket);
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const filteredTickets = tickets.filter((t: any) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const openTickets = tickets.filter((t: any) => t.status === 'open').length;
  const inProgressTickets = tickets.filter((t: any) => t.status === 'in_progress').length;
  const closedTickets = tickets.filter((t: any) => t.status === 'closed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Support Tickets</h1>
        <p className="text-gray-500 mt-1">Manage customer support requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Open Tickets</span>
            <MessageSquare className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{openTickets}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">In Progress</span>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{inProgressTickets}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Closed</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{closedTickets}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-[#8B6F47] text-white' : 'bg-gray-100'}`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg ${filter === 'open' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          >
            Open ({openTickets})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            In Progress ({inProgressTickets})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 rounded-lg ${filter === 'closed' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            Closed ({closedTickets})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No tickets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Ticket ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Subject</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket: any) => (
                  <tr key={ticket._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs">#{ticket._id.slice(-6)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-sm">{ticket.customer_name}</div>
                        <div className="text-xs text-gray-500">{ticket.customer_email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm">{ticket.subject}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleUpdateStatus(ticket._id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded-full border-0 ${
                          ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatNairobiDate(ticket.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setViewingTicket(ticket)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ticket #{viewingTicket._id.slice(-6)}</h2>
              <button onClick={() => setViewingTicket(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Customer</label>
                  <p className="font-semibold">{viewingTicket.customer_name}</p>
                  <p className="text-sm text-gray-500">{viewingTicket.customer_email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className="font-semibold capitalize">{viewingTicket.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">Subject</label>
                <p className="font-semibold">{viewingTicket.subject}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Message</label>
                <p className="text-gray-700 bg-gray-50 p-4 rounded">{viewingTicket.message}</p>
              </div>

              {viewingTicket.replies && viewingTicket.replies.length > 0 && (
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Replies</label>
                  <div className="space-y-2">
                    {viewingTicket.replies.map((r: any, idx: number) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded">
                        <p className="text-sm text-gray-700">{r.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatNairobiDateTime(r.created_at)} - Admin
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-500 mb-2 block">Send Reply</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Type your reply..."
                />
                <button
                  onClick={handleReply}
                  disabled={!reply.trim()}
                  className="mt-2 px-4 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6d5638] disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Admins Page
export function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'admin',
    permissions: ['read', 'write']
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/admins`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setAdmins(data.admins || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newAdmin),
      });
      if (res.ok) {
        fetchAdmins();
        setShowModal(false);
        setNewAdmin({ full_name: '', email: '', password: '', role: 'admin', permissions: ['read', 'write'] });
      }
    } catch (err) {
      console.error('Failed to create admin:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingAdmin) return;
    try {
      await fetch(`${API_URL}/admin/admins/${editingAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editingAdmin),
      });
      fetchAdmins();
      setEditingAdmin(null);
    } catch (err) {
      console.error('Failed to update admin:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this admin?')) {
      try {
        await fetch(`${API_URL}/admin/admins/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        fetchAdmins();
      } catch (err) {
        console.error('Failed to delete admin:', err);
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await fetch(`${API_URL}/admin/admins/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          status: currentStatus === 'active' ? 'suspended' : 'active',
        }),
      });
      fetchAdmins();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const activeAdmins = admins.filter((a: any) => a.status === 'active').length;
  const superAdmins = admins.filter((a: any) => a.role === 'super_admin').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Admin Management</h1>
          <p className="text-gray-500 mt-1">Manage admin users and permissions</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="admin-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Admins</span>
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{admins.length}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{activeAdmins}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Super Admins</span>
            <Shield className="w-5 h-5 text-[#8B6F47]" />
          </div>
          <p className="text-3xl font-bold text-[#8B6F47]">{superAdmins}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        {loading ? (
          <div className="text-center py-12">Loading admins...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Permissions</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin: any) => (
                  <tr key={admin._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="font-medium">{admin.username || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm">{admin.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        admin.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-gray-600">
                        {admin.permissions?.join(', ') || 'read, write'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleStatus(admin._id, admin.status || 'active')}
                        disabled={admin.role === 'super_admin'}
                        className={`px-3 py-1 text-xs rounded-full ${
                          (admin.status || 'active') === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } ${admin.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {(admin.status || 'active') === 'active' ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingAdmin(admin)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        {admin.role !== 'super_admin' && (
                          <button 
                            onClick={() => handleDelete(admin._id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Admin</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="admin@queenkoba.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreate}
                  disabled={!newAdmin.full_name || !newAdmin.email || !newAdmin.password}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638] disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Admin</h2>
              <button onClick={() => setEditingAdmin(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingAdmin.username || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, username: e.target.value, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">New Password (optional)</label>
                <input
                  type="password"
                  value={editingAdmin.password || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Leave blank to keep current"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={editingAdmin.role}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={editingAdmin.role === 'super_admin'}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638]"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Page
export function Settings() {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailSupport: true,
    emailReviews: false,
    emailPromotions: false
  });
  const [system, setSystem] = useState({
    siteName: 'Queen Koba',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: false
  });

  const handleProfileUpdate = async () => {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (profile.newPassword && !profile.currentPassword) {
      alert('Please enter your current password');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          current_password: profile.currentPassword,
          new_password: profile.newPassword
        })
      });
      
      if (response.ok) {
        alert('Password updated successfully');
        setProfile({ ...profile, currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update password');
      }
    } catch (error) {
      alert('Failed to update password');
    }
  };

  const handleNotificationsUpdate = () => {
    alert('Notification preferences updated');
  };

  const handleSystemUpdate = () => {
    alert('System settings updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your account and system preferences</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-[#8B6F47] text-[#8B6F47]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Profile & Security
          </div>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-[#8B6F47] text-[#8B6F47]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </div>
        </button>
        {user?.role === 'super_admin' && (
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'system'
                ? 'border-[#8B6F47] text-[#8B6F47]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              System
            </div>
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  value={user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={profile.currentPassword}
                    onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={profile.newPassword}
                    onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={profile.confirmPassword}
                    onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleProfileUpdate}
            className="px-6 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6d5638]"
          >
            Save Changes
          </button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Orders</p>
                  <p className="text-sm text-gray-500">Receive notifications for new orders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailOrders}
                    onChange={(e) => setNotifications({ ...notifications, emailOrders: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Support Tickets</p>
                  <p className="text-sm text-gray-500">Receive notifications for new support tickets</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailSupport}
                    onChange={(e) => setNotifications({ ...notifications, emailSupport: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Reviews</p>
                  <p className="text-sm text-gray-500">Receive notifications for new product reviews</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailReviews}
                    onChange={(e) => setNotifications({ ...notifications, emailReviews: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Promotions</p>
                  <p className="text-sm text-gray-500">Receive notifications about promotions and campaigns</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailPromotions}
                    onChange={(e) => setNotifications({ ...notifications, emailPromotions: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleNotificationsUpdate}
            className="px-6 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6d5638]"
          >
            Save Preferences
          </button>
        </div>
      )}

      {activeTab === 'system' && user?.role === 'super_admin' && (
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site Name</label>
                <input
                  type="text"
                  value={system.siteName}
                  onChange={(e) => setSystem({ ...system, siteName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Temporarily disable the website for maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={system.maintenanceMode}
                    onChange={(e) => setSystem({ ...system, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow User Registration</p>
                  <p className="text-sm text-gray-500">Allow new users to register accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={system.allowRegistration}
                    onChange={(e) => setSystem({ ...system, allowRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-gray-500">Users must verify their email before accessing the site</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={system.requireEmailVerification}
                    onChange={(e) => setSystem({ ...system, requireEmailVerification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B6F47]"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h2 className="text-xl font-semibold mb-4">Database Management</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 border-2 border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 text-left">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Backup Database</p>
                    <p className="text-sm text-gray-500">Create a backup of all data</p>
                  </div>
                </div>
              </button>
              <button className="w-full px-4 py-3 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-left">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Clear Cache</p>
                    <p className="text-sm text-gray-500">Clear all cached data</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={handleSystemUpdate}
            className="px-6 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6d5638]"
          >
            Save System Settings
          </button>
        </div>
      )}
    </div>
  );
}
