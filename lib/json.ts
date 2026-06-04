import type { Prisma } from "@prisma/client";

export function decodeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
