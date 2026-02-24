import "dotenv/config";
import fs from "fs";
import app from "./app";
import prisma from "./lib/prisma";

const PORT = process.env.PORT ?? 3000;

// สร้างโฟลเดอร์ uploads/ หากยังไม่มี
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// Graceful Shutdown — ปิด DB connection อย่างถูกต้องก่อนหยุด process
// ---------------------------------------------------------------------------
function gracefulShutdown(signal: string) {
  console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("✅  Server closed. Database disconnected.");
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error("❌  Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
