import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  employeeId: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false }, // Hidden by default
  role: { 
    type: String, 
    required: true, 
    enum: ['SYSTEM_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'DRIVER'] 
  },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Null for Admin
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

// Hash password before saving
schema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

// Helper to compare passwords
schema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

schema.index({ email: 1 }, { unique: true });
schema.plugin(toJSON);

export default mongoose.model("User", schema);