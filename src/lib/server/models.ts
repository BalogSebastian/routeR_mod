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
  favorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResetToken { _id: Types.ObjectId; userId: Types.ObjectId; tokenHash: string; expiresAt: Date }

/**
 * Sofőrnek elküldött útvonal-link. Az azonosítót a böngésző generálja (a link hash-ében utazik: #d=…&l=<id>),
 * a sofőr-oldal megnyitáskor jelez vissza. A „d” a link útvonal-adata, hogy a diszpécser később újra kimásolhassa.
 */
export interface IDriverLink {
  _id: string;
  userId: Types.ObjectId;
  tripName: string;
  from: string;
  to: string;
  km: number;
  dep?: string;
  arr?: string;
  /** a sofőr neve / rendszám (szabad szöveg) */
  driver?: string;
  /** whatsapp | viber | email | sms | copy | share | open */
  channel?: string;
  d: string;
  sentAt: Date;
  opens: number;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  createdAt: Date;
}

export interface IMailLog { _id: Types.ObjectId; to: string; subject: string; ok: boolean; error?: string; response?: string; at: Date }

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
    favorite: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const rateSchema = new Schema<IRateLimit>({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, expires: 0 },
});

const resetSchema = new Schema<IResetToken>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

const driverLinkSchema = new Schema<IDriverLink>(
  {
    _id: String,
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tripName: { type: String, maxlength: 160 },
    from: { type: String, maxlength: 120 },
    to: { type: String, maxlength: 120 },
    km: Number,
    dep: String,
    arr: String,
    driver: { type: String, maxlength: 80 },
    channel: String,
    d: String,
    sentAt: { type: Date, default: Date.now },
    opens: { type: Number, default: 0 },
    firstOpenedAt: Date,
    lastOpenedAt: Date,
    // 180 nap után magától törlődik
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
  },
  { versionKey: false },
);

const mailLogSchema = new Schema<IMailLog>({
  to: String, subject: String, ok: Boolean, error: String, response: String,
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

export interface INearCache { _id: string; fc: unknown; at: Date }
/** a megállók körüli parkolók: közös (minden felhasználónak) gyorsítótár, 21 napig él */
const nearSchema = new Schema<INearCache>({
  _id: String,
  fc: Schema.Types.Mixed,
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 21 },
});

export interface Db {
  DriverLink: Model<IDriverLink>;
  NearCache: Model<INearCache>;
  MailLog: Model<IMailLog>;
  ResetToken: Model<IResetToken>;
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
    DriverLink: (c.models.DriverLink as Model<IDriverLink>) ?? c.model<IDriverLink>("DriverLink", driverLinkSchema, "driverlinks"),
    NearCache: (c.models.NearCache as Model<INearCache>) ?? c.model<INearCache>("NearCache", nearSchema, "nearcache"),
    MailLog: (c.models.MailLog as Model<IMailLog>) ?? c.model<IMailLog>("MailLog", mailLogSchema, "maillog"),
    ResetToken: (c.models.ResetToken as Model<IResetToken>) ?? c.model<IResetToken>("ResetToken", resetSchema, "resettokens"),
    User: (c.models.User as Model<IUser>) ?? c.model<IUser>("User", userSchema, "users"),
    Settings: (c.models.Settings as Model<ISettings>) ?? c.model<ISettings>("Settings", settingsSchema, "settings"),
    Trip: (c.models.Trip as Model<ITrip>) ?? c.model<ITrip>("Trip", tripSchema, "trips"),
    RateLimit: (c.models.RateLimit as Model<IRateLimit>) ?? c.model<IRateLimit>("RateLimit", rateSchema, "ratelimits"),
  };
  return models;
}

export const isOid = (s: string) => mongoose.Types.ObjectId.isValid(s) && String(new mongoose.Types.ObjectId(s)) === s;
