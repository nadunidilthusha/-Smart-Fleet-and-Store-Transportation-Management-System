// Optional paging for list endpoints:  GET /api/bookings?page=2&limit=20
// Lists still return a plain array. The total is sent in the X-Total-Count header.
export function getPagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export function setTotalHeader(res, total) {
  res.set("X-Total-Count", String(total));
  res.set("Access-Control-Expose-Headers", "X-Total-Count");
}
