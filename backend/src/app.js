import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// The Express app. server.js starts it; keep database and listen() code out of this file.
const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV !== "test") app.use(morgan(env.isProd ? "combined" : "dev"));

// Every endpoint lives under /api (the frontends use VITE_API_BASE_URL=http://localhost:5000/api)
app.use("/api", routes);

// Keep these two last
app.use(notFound);
app.use(errorHandler);

export default app;
