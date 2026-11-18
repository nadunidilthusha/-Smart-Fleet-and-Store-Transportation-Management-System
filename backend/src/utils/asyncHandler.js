// Wrap every async controller so errors reach the error handler:
//   export const list = asyncHandler(async (req, res) => { ... });
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
