import { assertConfig, config, describeConfig } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db/connect.js";
import { createApp } from "./app.js";

assertConfig();

async function start() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(`\nVilla search API is up\n  ${describeConfig()}\n`);
  });

  const stop = async (signal) => {
    console.log(`\n${signal} received, finishing open requests.`);
    const forced = setTimeout(() => {
      console.warn("Requests took too long, closing anyway.");
      process.exit(1);
    }, config.server.shutdownTimeoutMs);
    forced.unref?.();

    server.close(async () => {
      await disconnectDatabase();
      console.log("Stopped cleanly.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
}

start().catch((error) => {
  console.error(`The server did not start: ${error.message}`);
  process.exit(1);
});
