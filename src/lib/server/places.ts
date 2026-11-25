import { z } from "zod";
import type { PlaceItem } from "@/lib/app-data";
import type { IPlace } from "./models";

export const placeBody = z.object({
  name: z.string().trim().min(1, "Adj nevet a helynek.").max(80),
  kind: z.enum(["depot", "customer", "loading", "parking", "service", "other"]).default("other"),
  label: z.string().trim().min(1).max(240),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  cc: z.string().max(4).optional(),
  hours: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const toPlaceItem = (p: IPlace): PlaceItem => ({
  id: String(p._id), name: p.name, kind: p.kind, label: p.label, lat: p.lat, lon: p.lon, cc: p.cc,
  hours: p.hours, contact: p.contact, phone: p.phone, notes: p.notes, uses: p.uses ?? 0,
  lastUsedAt: p.lastUsedAt ? new Date(p.lastUsedAt).toISOString() : undefined, updatedAt: new Date(p.updatedAt).toISOString(),
});
