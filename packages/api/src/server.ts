import { serve } from "@hono/node-server";
import { app } from "./app";
import { deployment, port } from "./config";

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Three Mary Jane Public Risk API listening on :${info.port} for Monad chain ${deployment.chainId}`);
});
