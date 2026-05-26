import { env } from "./config/env";
import { appendLogLineSync, logger } from "./config/logger";
import app from "./app";
import { startWeeklyReportScheduler } from "./services/weeklyReportScheduler";

process.on("uncaughtException", (err) => {
  const line = `[${new Date().toISOString()}] [FATAL] uncaughtException ${err.stack ?? err.message}\n`;
  appendLogLineSync(line);
  console.error(line.trimEnd());
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
  logger.error("unhandledRejection", { message: msg });
});

app.listen(env.port, () => {
  logger.info("server_start", { port: env.port, env: env.nodeEnv, logDir: env.logDir });
  console.log(`Backend listening on http://localhost:${env.port}`);
  startWeeklyReportScheduler();
});
