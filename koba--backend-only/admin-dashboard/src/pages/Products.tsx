import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'Cream',
    kes_price: '',
    in_stock: true,
    image_url: '',
    discount_percentage: 0,
    on_sale: false,
  });
  const queryClient = useQueryClient();

  const openAddProductModal = () => {
    setAddingProduct(true);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('action', 'new');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const closeAddProductModal = () => {
    setAddingProduct(false);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('action');
    setSearchParams(nextSearchParams, { replace: true });
  };

  useEffect(() => {
    setAddingProduct(searchParams.get('action') === 'new');
  }, [searchParams]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeAddProductModal();
      setNewProduct({ 
        name: '', 
        description: '', 
        category: 'Cream', 
        kes_price: '', 
        in_stock: true, 
        image_url: '',
        discount_percentage: 0,
        on_sale: false
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const products = data?.products || [];
  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getKESPrice = (product: any) => {
    // Handle both array format and object format
    if (Array.isArray(product.prices)) {
      const kesPrice = product.prices.find((p: any) => p.currency === 'KES');
      return kesPrice?.price || 0;
    } else if (product.prices && typeof product.prices === 'object') {
      // Handle object format like { KES: { amount: 3850 } }
      return product.prices.KES?.amount || 0;
    }
    return 0;
  };

  const handleEdit = (product: any) => {
    setEditingProduct({
      ...product,
      kes_price: getKESPrice(product),
    });
  };

  const handleUpdate = () => {
    if (!editingProduct) return;
    
    // Handle both array and object price formats
    let updatedPrices;
    if (Array.isArray(editingProduct.prices)) {
      updatedPrices = editingProduct.prices.map((p: any) => 
        p.currency === 'KES' ? { ...p, price: Number(editingProduct.kes_price) } : p
      );
      if (!updatedPrices.some((p: any) => p.currency === 'KES')) {
        updatedPrices.push({ currency: 'KES', price: Number(editingProduct.kes_price), country: 'Kenya' });
      }
    } else {
      // Object format
      updatedPrices = {
        ...editingProduct.prices,
        KES: { amount: Number(editingProduct.kes_price), symbol: 'KSh', country: 'Kenya' }
      };
    }

    updateMutation.mutate({
      id: editingProduct._id,
      data: {
        name: editingProduct.name,
        description: editingProduct.description,
        category: editingProduct.category,
        in_stock: editingProduct.in_stock,
        prices: updatedPrices,
        image_url: editingProduct.image_url,
        discount_percentage: editingProduct.discount_percentage || 0,
        on_sale: editingProduct.on_sale || false
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    if (!newProduct.name || !newProduct.kes_price) return;
    
    const kesAmount = Number(newProduct.kes_price);
    const prices = {
      KES: { amount: kesAmount, symbol: 'KSh', country: 'Kenya' },
      UGX: { amount: Math.round(kesAmount * 27.88), symbol: 'USh', country: 'Uganda' },
      BIF: { amount: Math.round(kesAmount * 22.18), symbol: 'FBu', country: 'Burundi' },
      CDF: { amount: Math.round(kesAmount * 21.01), symbol: 'FC', country: 'DRC Congo' }
    };

    createMutation.mutate({
      name: newProduct.name,
      description: newProduct.description,
      category: newProduct.category,
      in_stock: newProduct.in_stock,
      base_price_usd: Math.round((kesAmount / 128.5) * 100) / 100,
      prices: prices,
      image_url: newProduct.image_url || '/images/product.jpg',
      discount_percentage: newProduct.discount_percentage || 0,
      on_sale: newProduct.on_sale || false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <button 
          onClick={openAddProductModal}
          className="admin-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Price (KES)</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any) => (
                  <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">KES {getKESPrice(product).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product._id)}
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

      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price (KES)</label>
                <input
                  type="number"
                  value={editingProduct.kes_price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, kes_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingProduct.discount_percentage || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, discount_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.on_sale}
                    onChange={(e) => setEditingProduct({ ...editingProduct, on_sale: e.target.checked })}
                  />
                  <span className="text-sm font-medium">On Sale</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.in_stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, in_stock: e.target.checked })}
                  />
                  <span className="text-sm font-medium">In Stock</span>
                </label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638]"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add New Product</h2>
              <button onClick={closeAddProductModal}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Product name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Product description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Cream">Cream</option>
                  <option value="Serum">Serum</option>
                  <option value="Mask">Mask</option>
                  <option value="Scrub">Scrub</option>
                  <option value="Cleanser">Cleanser</option>
                  <option value="Toner">Toner</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price (KES)</label>
                <input
                  type="number"
                  value={newProduct.kes_price}
                  onChange={(e) => setNewProduct({ ...newProduct, kes_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Or Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewProduct({ ...newProduct, image_url: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                {newProduct.image_url && (
                  <img src={newProduct.image_url} alt="Preview" className="mt-2 w-full h-64 object-cover rounded" />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newProduct.discount_percentage || 0}
                  onChange={(e) => setNewProduct({ ...newProduct, discount_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newProduct.on_sale || false}
                    onChange={(e) => setNewProduct({ ...newProduct, on_sale: e.target.checked })}
                  />
                  <span className="text-sm font-medium">On Sale</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newProduct.in_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, in_stock: e.target.checked })}
                  />
                  <span className="text-sm font-medium">In Stock</span>
                </label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newProduct.name || !newProduct.kes_price}
                  className="flex-1 bg-[#8B6F47] text-white py-2 rounded-lg hover:bg-[#6d5638] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Product'}
                </button>
                <button
                  onClick={closeAddProductModal}
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
