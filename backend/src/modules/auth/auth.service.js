import User from "../users/users.model.js";
import { signToken } from "../../utils/token.js";

// Business logic and database access for auth lives here.
// Controllers call these functions. Keep req and res out of this file.
// TODO: check the password (bcryptjs), then return { token: signToken(...), user }  -> see utils/token.js
