import apiClient from "./apiClient";

/*
  Store Web goods confirmation (three steps: prepared → handover → receipt).

  GET  /store/goods-confirmation?booking=BK-…  ->  { active, queue, tabCounts }
  POST /store/goods-confirmation/draft         body { bookingId, stage, lines, note, handoverAt?, resolution? }
  POST /store/goods-confirmation/confirm       same body plus acknowledged: true
  POST /store/goods-confirmation/cancel        body { bookingId, reason }  (store manager)
*/

// Turn an Axios error into a plain Error the page can show (keeps field-level messages when the API sends them)
export function parseConfirmationError(err, fallback = "Something went wrong. Check your connection and try again.") {
  const data = err?.response?.data;
  const error = new Error(data?.errors?.[0]?.message || data?.message || (err?.request && !err?.response ? "Cannot reach the server." : fallback));
  error.code = data?.code;
  error.errors = data?.errors ?? [];
  return error;
}

// Open booking (or the next one that needs work) plus the queue and tab counts for this store
export async function getGoodsConfirmation(booking) {
  try {
    const { data } = await apiClient.get("/store/goods-confirmation", { params: booking ? { booking } : {} });
    return data;
  } catch (err) {
    throw parseConfirmationError(err, "Unable to load goods confirmation.");
  }
}

// Save the quantities of one step without completing it
export async function saveConfirmationDraft(payload) {
  try {
    const { data } = await apiClient.post("/store/goods-confirmation/draft", payload);
    return data;
  } catch (err) {
    throw parseConfirmationError(err, "Unable to save draft.");
  }
}

// Complete one step (prepared, handover or receipt)
export async function confirmGoodsStage(payload) {
  try {
    const { data } = await apiClient.post("/store/goods-confirmation/confirm", { ...payload, acknowledged: true });
    return data;
  } catch (err) {
    throw parseConfirmationError(err, "Unable to confirm this step.");
  }
}

// Cancel the confirmation and revalidate the trip (store manager only)
export async function cancelGoodsConfirmation(payload) {
  try {
    const { data } = await apiClient.post("/store/goods-confirmation/cancel", payload);
    return data;
  } catch (err) {
    throw parseConfirmationError(err, "Unable to cancel this confirmation.");
  }
}
