import mongoose, { Schema, type Model, type Types } from "mongoose";
import { connect } from "./db";

export type UserStatus = "pending" | "active" | "blocked";
export type UserRole = "user" | "admin";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  /** a jelszócsere / tiltás érvényteleníti a meglévő munkameneteket */
  sessionVersion: number;
  createdAt: Date;
  approvedAt?: Date;
  lastLoginAt?: Date;
}

export interface ISettings {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** vehicle, costs, fleet, noGo, crossings… (a tervező mentett beállításai) */
  data: Record<string, unknown>;
  updatedAt: Date;
}

export interface ITripSummary {
  distanceKm: number;
  roadKm: number;
  tollEur: number;
  totalEur: number;
  drivingMin: number;
  days: number;
  arrival: string;
  countries: string[];
  roads: string[];
}

export interface ITrip {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  waypoints: { lat: number; lon: number; label: string; via?: boolean; ferry?: string; cargo?: string }[];
  vehicle: Record<string, unknown>;
  options: Record<string, unknown>;
  summary: ITripSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRateLimit { _id: string; count: number; expiresAt: Date }

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    company: String,
    phone: String,
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["pending", "active", "blocked"], default: "pending", index: true },
    sessionVersion: { type: Number, default: 0 },
    approvedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const settingsSchema = new Schema<ISettings>(
  { userId: { type: Schema.Types.ObjectId, required: true, unique: true }, data: { type: Schema.Types.Mixed, default: {} } },
  { timestamps: { createdAt: false, updatedAt: true } },
);

const tripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    waypoints: { type: Schema.Types.Mixed, required: true },
    vehicle: { type: Schema.Types.Mixed, default: {} },
    options: { type: Schema.Types.Mixed, default: {} },
    summary: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const rateSchema = new Schema<IRateLimit>({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, expires: 0 },
});

export interface Db {
  User: Model<IUser>;
  Settings: Model<ISettings>;
  Trip: Model<ITrip>;
  RateLimit: Model<IRateLimit>;
}

let models: Db | null = null;
export async function getDb(): Promise<Db> {
  if (models) return models;
  const c = await connect();
  models = {
    User: (c.models.User as Model<IUser>) ?? c.model<IUser>("User", userSchema, "users"),
    Settings: (c.models.Settings as Model<ISettings>) ?? c.model<ISettings>("Settings", settingsSchema, "settings"),
    Trip: (c.models.Trip as Model<ITrip>) ?? c.model<ITrip>("Trip", tripSchema, "trips"),
    RateLimit: (c.models.RateLimit as Model<IRateLimit>) ?? c.model<IRateLimit>("RateLimit", rateSchema, "ratelimits"),
  };
  return models;
}

export const isOid = (s: string) => mongoose.Types.ObjectId.isValid(s) && String(new mongoose.Types.ObjectId(s)) === s;
