import { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { normalizeApiUrl } from "@/lib/runtimeConfig";

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

interface SaleProduct {
  _id: string;
  name: string;
  discount_percentage: number;
  image_url: string;
}

export default function SalePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [saleProduct, setSaleProduct] = useState<SaleProduct | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('salePopupSeen');
    
    if (!hasSeenPopup) {
      fetchSaleProduct();
    }
  }, []);

  const fetchSaleProduct = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) return;
      const data = await response.json();
      
      const onSaleProducts = data.products?.filter(
        (p: { on_sale?: boolean; discount_percentage?: number }) =>
          Boolean(p.on_sale && (p.discount_percentage ?? 0) > 0),
      );
      
      if (onSaleProducts && onSaleProducts.length > 0) {
        setSaleProduct(onSaleProducts[0]);
        setTimeout(() => setIsOpen(true), 2000);
      }
    } catch {
      // Backend is optional for this popup; silently skip when unavailable.
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('salePopupSeen', 'true');
  };

  const handleShopNow = () => {
    handleClose();
    navigate(`/shop`);
  };

  if (!isOpen || !saleProduct) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {saleProduct.discount_percentage}% OFF
          </div>
          <img
            src={saleProduct.image_url}
            alt={saleProduct.name}
            className="w-full h-64 object-cover"
          />
        </div>

        <div className="p-6 text-center">
          <h2 className="font-display text-3xl font-bold mb-2">
            Special Offer!
          </h2>
          <p className="text-xl font-semibold text-gray-700 mb-4">
            {saleProduct.name}
          </p>
          <p className="text-gray-600 mb-6">
            Get <span className="text-red-600 font-bold text-2xl">{saleProduct.discount_percentage}%</span> off this amazing product!
          </p>
          <button
            onClick={handleShopNow}
            className="w-full py-4 bg-gradient-to-r from-[#8B6F47] to-[#6d5638] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-opacity"
          >
            Shop Now
          </button>
          <button
            onClick={handleClose}
            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
