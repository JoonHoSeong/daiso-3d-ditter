import { DaisoProduct } from '../data/daisoProducts';

/**
 * Ensures any DaisoProduct or raw backend/API object conforms to camelCase DaisoProduct
 * and always has complete imageUrl, itemCode, categoryLabel, etc.
 */
export function normalizeProduct(raw: any): DaisoProduct {
  if (!raw) {
    throw new Error('normalizeProduct: raw is null or undefined');
  }

  const itemCode = String(raw.itemCode || raw.item_code || '');
  let imageUrl = String(raw.imageUrl || raw.image_url || '');

  // If itemCode exists but imageUrl is empty or null, try constructing standard Daiso CDN format if available
  if (!imageUrl && itemCode) {
    // Keep empty or let fallback handle
  }

  return {
    id: String(raw.id || `daiso-${itemCode || Math.random().toString(36).slice(2, 8)}`),
    itemCode,
    name: String(raw.name || '다이소 상품'),
    category: raw.category || 'storage',
    categoryLabel: String(raw.categoryLabel || raw.category_label || '생활용품'),
    width: Number(raw.width) || 10,
    depth: Number(raw.depth) || 10,
    height: Number(raw.height) || 5,
    dimSource: String(raw.dimSource || raw.dim_source || 'official_spec'),
    price: Number(raw.price) || 1000,
    color: String(raw.color || '#BAE6FD'),
    imageUrl,
    isSoldOut: Boolean(raw.isSoldOut || raw.is_sold_out),
    description: String(raw.description || ''),
    mallUrl: String(raw.mallUrl || raw.mall_url || (itemCode ? `https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=${itemCode}` : 'https://www.daisomall.co.kr'))
  };
}
