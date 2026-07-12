import "dotenv/config";
import app from "./app.js";
import { prisma } from "./config/prisma.js";

const port = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();

    console.log("Connected to MySQL successfully.");

    app.listen(port, () => {
      console.log(`TaskFlow API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

void startServer();