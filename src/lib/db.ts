import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * Prisma client singleton.
 *
 * In dev, Next.js hot-reload re-evaluates modules frequently; without caching
 * the instance on `globalThis` we'd exhaust the DB connection pool. In prod a
 * single instance is created per server process.
 */
const createPrisma = () => {
  const datasourceUrl = process.env.DATABASE_URL;
  const usesAccelerate =
    datasourceUrl?.startsWith("prisma://") ||
    datasourceUrl?.startsWith("prisma+postgres://");
  const client = new PrismaClient(
    (usesAccelerate ? { datasourceUrl } : {}) as ConstructorParameters<typeof PrismaClient>[0],
  );

  // Accelerate is only applied to edge-compatible prisma:// connections. A
  // direct local/dev connection continues using Prisma's regular engine.
  return (usesAccelerate ? client.$extends(withAccelerate()) : client) as PrismaClient;
};

type PrismaClientWithAccelerate = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithAccelerate | undefined;
};

export const db =
  globalForPrisma.prisma ??
  createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
