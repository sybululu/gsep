export function toValidFirestoreId(raw: string, fallbackPrefix = 'img') {
  const cleaned = raw
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  return cleaned || `${fallbackPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
