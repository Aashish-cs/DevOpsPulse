import { prisma } from "../lib/prisma.js";

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "monitor";
}

export async function generateUniqueSlug(name: string) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;

  while (await prisma.monitor.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
