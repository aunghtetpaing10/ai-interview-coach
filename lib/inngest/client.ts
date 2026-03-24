import "server-only";

import { Inngest } from "inngest";
import { getEnv } from "@/lib/env";

export interface InngestClientConfig {
  appId: string;
  eventKey?: string;
  signingKey?: string;
  dev?: string;
}

export function getInngestClientConfig(): InngestClientConfig {
  const env = getEnv();

  return {
    appId: env.INNGEST_APP_ID,
    eventKey: env.INNGEST_EVENT_KEY,
    signingKey: env.INNGEST_SIGNING_KEY,
    dev: env.INNGEST_DEV,
  };
}

export function createInngestClient() {
  const config = getInngestClientConfig();

  return new Inngest({
    id: config.appId,
    eventKey: config.eventKey,
    signingKey: config.signingKey,
  });
}

export const inngest = createInngestClient();
