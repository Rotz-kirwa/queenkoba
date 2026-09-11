import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, AlertTriangle, TrendingUp, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { useState } from 'react';

export default function Inventory() {
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingImage(null);
      setImageUrl('');
    },
  });

  const products = data?.products || [];
  const lowStock = products.filter((p: any) => !p.in_stock).length;
  const inStock = products.filter((p: any) => p.in_stock).length;

  const handleStockUpdate = (product: any, inStock: boolean) => {
    updateMutation.mutate({
      id: product._id,
      data: { in_stock: inStock },
    });
  };

  const handleImageUpdate = (productId: string) => {
    if (!imageUrl.trim()) return;
    updateMutation.mutate({
      id: productId,
      data: { image_url: imageUrl },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 mt-1">Track and manage product stock levels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Products</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">In Stock</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{inStock}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Out of Stock</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{lowStock}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <h2 className="text-xl font-semibold mb-4">Stock Status</h2>
        
        {isLoading ? (
          <div className="text-center py-12">Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Price (KES)</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Image</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => {
                  const kesPrice = product.prices?.KES?.amount || 0;
                  return (
                    <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="w-24 h-24 object-cover rounded" />
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description?.substring(0, 40)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">KES {kesPrice.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        {editingImage === product._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="Image URL"
                              className="px-2 py-1 text-sm border rounded w-48"
                            />
                            <button
                              onClick={() => handleImageUpdate(product._id)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingImage(null);
                                setImageUrl('');
                              }}
                              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingImage(product._id);
                              setImageUrl(product.image_url || '');
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                          >
                            <Upload className="w-3 h-3" />
                            {product.image_url ? 'Update' : 'Add'}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          product.in_stock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {product.in_stock ? (
                            <button
                              onClick={() => handleStockUpdate(product, false)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Mark Out of Stock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStockUpdate(product, true)}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Mark In Stock
                            </button>
                          )}
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
    </div>
  );
}
