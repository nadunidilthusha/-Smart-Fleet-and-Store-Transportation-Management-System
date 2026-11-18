import { Router } from "express";
import bookingsStore from "../modules/bookings/bookings.store.routes.js";
import tripsStore from "../modules/trips/trips.store.routes.js";
import scheduleStore from "../modules/schedule/schedule.store.routes.js";
import confirmationStore from "../modules/confirmation/confirmation.store.routes.js";
import notificationsStore from "../modules/notifications/notifications.store.routes.js";
import dashboardStore from "../modules/dashboard/dashboard.store.routes.js";

// Store portal endpoints, all under /api/store.
// protect + store-role guard are applied in routes/index.js.
// Every query here must be limited to the signed-in store: req.user.storeId
const router = Router();

router.use(bookingsStore);
router.use(tripsStore);
router.use(scheduleStore);
router.use(confirmationStore);
router.use(notificationsStore);
router.use(dashboardStore);

export default router;
