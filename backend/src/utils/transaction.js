import mongoose from "mongoose";

// MongoDB only allows transactions on a replica set (Atlas always is). A standalone server answers with these.
const unsupported = (err) => err?.code === 20 || /transaction numbers are only allowed|replica set/i.test(err?.message ?? "");

/*
  Run several writes as one unit: either all of them are saved or none.
    const result = await runInTransaction(async (session) => {
      await Booking.updateOne({ _id }, { ... }, { session });   // pass { session } to every query
      return something;
    });
  On a database without transactions the work runs normally (without the all-or-nothing guarantee).
  Send notifications and audit entries after it returns, never inside.
*/
export default async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    // The first query of a transaction fails before anything is written, so running again without one is safe
    if (unsupported(err)) return work(null);
    throw err;
  } finally {
    await session.endSession();
  }
}
