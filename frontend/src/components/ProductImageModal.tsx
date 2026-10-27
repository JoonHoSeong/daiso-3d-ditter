import React from 'react';
import { DaisoProduct } from '../data/daisoProducts';
import { X, ExternalLink, Plus } from 'lucide-react';

interface ProductImageModalProps {
  product: DaisoProduct | null;
  onClose: () => void;
  onAddProduct: (product: DaisoProduct) => void;
}

export const ProductImageModal: React.FC<ProductImageModalProps> = ({
  product,
  onClose,
  onAddProduct
}) => {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-600 flex items-center justify-center shadow-md transition-colors"
        >
          <X size={18} />
        </button>

        {/* Image Preview Container */}
        <div className="w-full h-64 bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-2"
              loading="lazy"
              onError={(e) => {
                // Fallback to stylized box
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div
                className="w-20 h-20 rounded-xl shadow-inner border border-slate-300"
                style={{ backgroundColor: product.color }}
              />
              <span className="text-xs">3D 트레이 규격 모델</span>
            </div>
          )}

          {/* Category Badge */}
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200">
            {product.categoryLabel}
          </span>
        </div>

        {/* Product Details */}
        <div className="p-5 space-y-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {product.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span>품번: <strong className="text-slate-700">{product.itemCode}</strong></span>
              <span>•</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                {product.dimSource === 'inferred' ? '~ ' : ''}{product.width} × {product.depth} × {product.height} cm
              </span>
              {product.dimSource === 'inferred' ? (
                <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  추정 규격 (상세페이지 텍스트 미제공)
                </span>
              ) : (
                <span className="text-[10px] font-sans font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                  다이소몰 공식 규격
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {product.description || `${product.width}×${product.depth}×${product.height}cm 규격의 다이소 수납함입니다.`}
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">판매 가격</span>
              <div className="text-base font-bold text-daiso-red font-mono">
                ₩{product.price.toLocaleString()}원
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={product.mallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <ExternalLink size={13} className="mr-1.5" />
                다이소몰 상세
              </a>

              <button
                onClick={() => {
                  onAddProduct(product);
                  onClose();
                }}
                className="flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-daiso-red hover:bg-daiso-redHover shadow-sm shadow-red-500/20 transition-all active:scale-95"
              >
                <Plus size={14} className="mr-1" />
                서랍에 담기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
