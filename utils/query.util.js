export function buildFilter({ category, minPrice, maxPrice }) {
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  return filter;
}

export function buildSort(sort) {
  if (!sort) return { createdAt: -1 };

  const map = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
  };

  return map[sort] || { createdAt: -1 };
}