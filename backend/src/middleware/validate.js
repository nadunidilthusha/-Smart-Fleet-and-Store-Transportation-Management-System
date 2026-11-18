// Validates a request with zod schemas. Pass any of body, query, params:
//   router.post("/", validate({ body: createBookingSchema }), controller.create);
// Invalid input becomes a 422 response (see errorHandler.js).
export default function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
