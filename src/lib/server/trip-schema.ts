import { z } from "zod";

export const tripSchema = z.object({
  name: z.string().trim().min(1, "Adj nevet a fuvarnak.").max(120),
  waypoints: z.array(z.object({
    lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), label: z.string().max(200),
    via: z.boolean().optional(), ferry: z.string().max(60).optional(), cargo: z.string().max(10).optional(),
  })).min(2).max(14),
  vehicle: z.record(z.string(), z.unknown()),
  options: z.record(z.string(), z.unknown()),
  summary: z.object({
    distanceKm: z.number(), roadKm: z.number(), tollEur: z.number(), totalEur: z.number(), drivingMin: z.number(),
    days: z.number(), arrival: z.string().max(40), countries: z.array(z.string().max(4)).max(30), roads: z.array(z.string().max(30)).max(40),
  }),
});
