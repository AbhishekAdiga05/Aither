import { proxy, config as proxyConfig } from "./proxy";

export function middleware(request) {
  return proxy(request);
}

export const config = proxyConfig;
