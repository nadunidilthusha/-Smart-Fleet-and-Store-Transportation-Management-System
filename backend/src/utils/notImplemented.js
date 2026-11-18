import ApiError from "./ApiError.js";

// Placeholder used by the empty controllers. Delete the call when you build the endpoint.
export default function notImplemented(label = "This endpoint") {
  throw ApiError.notImplemented(`${label} is not built yet.`);
}
