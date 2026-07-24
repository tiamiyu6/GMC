import net from "node:net";
import tls from "node:tls";
import { encodeSentence, SentenceDecoder, parseWords, type RosReply } from "./protocol";

export class MikrotikApiError extends Error {
  constructor(message: string, public readonly attrs?: Record<string, string>) {
    super(message);
    this.name = "MikrotikApiError";
  }
}

export interface MikrotikConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  useTls?: boolean;
  timeoutMs?: number;
}

function readConfigFromEnv(): MikrotikConfig {
  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      "Mikrotik is not configured: set MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD (or MIKROTIK_MOCK=true for local dev)."
    );
  }

  return {
    host,
    port: Number(process.env.MIKROTIK_PORT ?? (process.env.MIKROTIK_USE_TLS === "true" ? 8729 : 8728)),
    user,
    password,
    useTls: process.env.MIKROTIK_USE_TLS === "true",
    timeoutMs: 8000,
  };
}

export const isMikrotikMocked = () => process.env.MIKROTIK_MOCK === "true";

/**
 * One short-lived connection per call: logs in, runs a single command,
 * collects replies until !done/!trap, then disconnects. RouterOS billing
 * volumes here (a handful of admin/order actions per minute) don't warrant
 * a pooled/keep-alive connection, and a fresh connection avoids stale-session
 * bugs.
 */
export async function talk(
  words: string[],
  config: MikrotikConfig = readConfigFromEnv()
): Promise<RosReply[]> {
  return new Promise((resolve, reject) => {
    const decoder = new SentenceDecoder();
    const replies: RosReply[] = [];
    let settled = false;

    const socket: net.Socket = config.useTls
      ? tls.connect({ host: config.host, port: config.port, rejectUnauthorized: false })
      : net.connect({ host: config.host, port: config.port });

    const timeout = setTimeout(() => {
      fail(new MikrotikApiError(`Timed out connecting to Mikrotik at ${config.host}:${config.port}`));
    }, config.timeoutMs ?? 8000);

    function fail(err: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      reject(err);
    }

    function succeed(value: RosReply[]) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.end();
      resolve(value);
    }

    socket.on("error", (err) => fail(new MikrotikApiError(`Mikrotik connection error: ${err.message}`)));

    socket.on("connect", () => {
      socket.write(encodeSentence(["/login", `=name=${config.user}`, `=password=${config.password}`]));
    });

    let loggedIn = false;

    socket.on("data", (chunk) => {
      const sentences = decoder.push(chunk);
      for (const sentenceWords of sentences) {
        const reply = parseWords(sentenceWords);

        if (!loggedIn) {
          if (reply.tag === "!trap" || reply.tag === "!fatal") {
            fail(new MikrotikApiError(`Mikrotik login failed: ${reply.attrs.message ?? "unknown error"}`, reply.attrs));
            return;
          }
          if (reply.tag === "!done") {
            loggedIn = true;
            socket.write(encodeSentence(words));
          }
          continue;
        }

        if (reply.tag === "!trap") {
          fail(new MikrotikApiError(reply.attrs.message ?? "Mikrotik command failed", reply.attrs));
          return;
        }
        if (reply.tag === "!fatal") {
          fail(new MikrotikApiError(reply.attrs.message ?? "Mikrotik fatal error", reply.attrs));
          return;
        }
        if (reply.tag === "!done") {
          succeed(replies);
          return;
        }
        if (reply.tag === "!re") {
          replies.push(reply);
        }
      }
    });
  });
}
