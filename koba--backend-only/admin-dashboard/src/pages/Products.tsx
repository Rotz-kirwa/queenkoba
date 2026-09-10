import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react';

interface ProductItem {
  id: string;
  catalog_key?: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  image: string;
  in_stock?: boolean;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'new-cleanser',
    catalog_key: 'new-cleanser',
    name: 'Complexion Clarifying Cleanser 120ml',
    price: 1899,
    description: 'Brightening face cleanser for dull skin, buildup, and uneven skin tone.',
    category: 'Cleanser',
    image: '/images/products/complexion-clarifying-cleanser.webp',
    in_stock: true,
  },
  {
    id: 'new-toner',
    catalog_key: 'new-toner',
    name: 'Brightening Toner 120ml',
    price: 1999,
    description: 'Brightening toner for dark spots, uneven skin tone, and post-blemish marks.',
    category: 'Toner',
    image: '/images/products/brightening-toner.webp',
    in_stock: true,
  },
  {
    id: 'new-serum',
    catalog_key: 'new-serum',
    name: 'Complexion Clarifying Serum 30ml',
    price: 2499,
    description: 'Dark spot corrector serum for hyperpigmentation, post-acne marks, and uneven skin tone.',
    category: 'Serum',
    image: '/images/products/complexion-clarifying-serum.webp',
    in_stock: true,
  },
  {
    id: 'new-cream',
    catalog_key: 'new-cream',
    name: 'Complexion Clarifying Cream 50ml',
    price: 2399,
    description: 'Skin brightening cream for uneven skin tone, dryness, and dull skin.',
    category: 'Cream',
    image: '/images/products/complexion-clarifying-cream.webp',
    in_stock: true,
  },
  {
    id: 'new-mask',
    catalog_key: 'new-mask',
    name: 'Brightening Face Mask 120ml',
    price: 1499,
    description: 'Face brightening mask for dull skin, buildup, and uneven tone.',
    category: 'Mask',
    image: '/images/products/brightening-face-mask.webp',
    in_stock: true,
  },
  {
    id: 'new-bundle',
    catalog_key: 'new-bundle',
    name: 'Full Product Kit',
    price: 9999,
    description: 'Complete skincare kit for hyperpigmentation, dark spots, and glowing skin.',
    category: 'Bundle',
    image: '/images/products/full-product-kit.webp',
    in_stock: true,
  },
];

export default function Products() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [catalogKey, setCatalogKey] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const notifyStorefront = () => {
    try {
      localStorage.setItem('qk_admin_product_updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('qk-products-updated'));
    } catch {
      // Ignore cross-origin localStorage restriction if any
    }
  };

  const loadProducts = async () => {
    try {
      const data = await adminAPI.getProducts();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(
          data.map((product: any) => ({
            id: String(product.id || product._id),
            catalog_key: product.catalog_key || product.catalogKey,
            name: product.name,
            price:
              typeof product.price === 'number'
                ? product.price
                : product.prices?.KES?.amount
                ? Math.round(product.prices.KES.amount)
                : Math.round((product.base_price_usd || 0) * 128.5),
            description: product.description || '',
            category: product.category || 'General',
            image: product.image || product.image_url || '/images/products/complexion-clarifying-serum.webp',
            in_stock: product.in_stock ?? true,
          }))
        );
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }
    } catch (error) {
      console.error('Failed to load products from API, using catalog default:', error);
      setProducts(DEFAULT_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategory('Serum');
    setCatalogKey('');
    setDescription('');
    setImage('/images/products/complexion-clarifying-serum.webp');
    setInStock(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price);
    setCategory(product.category || 'General');
    setCatalogKey(product.catalog_key || product.id);
    setDescription(product.description);
    setImage(product.image);
    setInStock(product.in_stock ?? true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (!price || Number(price) <= 0) {
      setFormError('A valid price in KSh is required');
      return;
    }

    setSaving(true);
    setFormError(null);
    setFormSuccess(null);

    const payload = {
      name: name.trim(),
      price: Number(price),
      category: category.trim() || 'General',
      catalog_key: catalogKey.trim() || undefined,
      description: description.trim(),
      image_url: image.trim(),
      image: image.trim(),
      in_stock: inStock,
    };

    try {
      if (editingProduct) {
        await adminAPI.updateProduct(editingProduct.id, payload);
        setFormSuccess('Product updated successfully! Reflected on storefront.');
      } else {
        await adminAPI.createProduct(payload);
        setFormSuccess('Product created successfully! Reflected on storefront.');
      }

      notifyStorefront();
      await loadProducts();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 700);
    } catch (error: any) {
      console.error('Save product error:', error);
      // If API fails (e.g. mock mode or offline backend), update local state as graceful preview
      if (editingProduct) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...p, ...payload, price: Number(price) }
              : p
          )
        );
        notifyStorefront();
        setFormSuccess('Product updated locally.');
        setTimeout(() => setIsModalOpen(false), 700);
      } else {
        setFormError(error.message || 'Failed to save product');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminAPI.deleteProduct(id);
      notifyStorefront();
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      notifyStorefront();
    }
  };

  if (loading) return <div className="p-4 lg:p-8 pt-20 lg:pt-8 text-gray-500 font-medium">Loading products...</div>;

  return (
    <div className="p-4 lg:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">Products Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage product catalog, prices, descriptions, and stock. Changes sync to the Home page and Shop page.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-amber-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-amber-800 transition-colors text-sm font-semibold shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md"
          >
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/products/complexion-clarifying-serum.webp';
                }}
              />
              <div className="absolute top-3 right-3 flex gap-1">
                {product.in_stock ? (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    In Stock
                  </span>
                ) : (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Out of Stock
                  </span>
                )}
              </div>
              {product.category && (
                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded shadow">
                  {product.category}
                </div>
              )}
            </div>

            <div className="p-5 flex flex-1 flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 line-clamp-1">{product.name}</h3>
                <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xl font-bold text-amber-900">
                  KSh {product.price.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Product"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Complexion Clarifying Serum 30ml"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Price (KSh) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="2499"
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm"
                  >
                    <option value="Serum">Serum</option>
                    <option value="Cleanser">Cleanser</option>
                    <option value="Toner">Toner</option>
                    <option value="Cream">Cream</option>
                    <option value="Mask">Mask</option>
                    <option value="Bundle">Bundle</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catalog Key / Slug
                </label>
                <input
                  type="text"
                  value={catalogKey}
                  onChange={(e) => setCatalogKey(e.target.value)}
                  placeholder="e.g. new-serum, new-cleanser, new-bundle"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm"
                />
                <span className="text-[11px] text-gray-400">Used for URL routes like /shop/new-serum</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/images/products/complexion-clarifying-serum.webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dark spot corrector serum for hyperpigmentation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="in_stock"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="h-4 w-4 text-amber-700 border-gray-300 rounded focus:ring-amber-700"
                />
                <label htmlFor="in_stock" className="text-xs font-medium text-gray-700 select-none cursor-pointer">
                  Product is In Stock and Available for Purchase
                </label>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
