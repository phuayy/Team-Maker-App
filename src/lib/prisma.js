import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

// Use a Proxy so the client is only instantiated when actually accessed at runtime,
// not at import/build time (avoids connection errors with placeholder DATABASE_URL).
const prisma = new Proxy({}, {
  get(_target, prop) {
    return getPrismaClient()[prop];
  },
});

export default prisma;

