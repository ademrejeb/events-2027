import type { NextApiHandler } from "next";
import { logEvent } from "./logger";

const SLOW_MS = 800;

export function withApiLog(handler: NextApiHandler): NextApiHandler {
  return (req, res) => {
    const started = performance.now();
    let logged = false;

    const done = () => {
      if (logged) return;
      logged = true;
      const durationMs = Math.round(performance.now() - started);
      const route = (req.url ?? "").split("?")[0];
      const level =
        res.statusCode >= 500 ? "error" : durationMs >= SLOW_MS ? "warn" : "info";
      logEvent(level, "api.request", {
        method: req.method,
        route,
        status: res.statusCode,
        durationMs,
      });
    };

    res.once("finish", done);
    res.once("close", done);

    return handler(req, res);
  };
}
