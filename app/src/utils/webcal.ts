import { Club } from "@project.config";

const HTTP_PROTOCOL_PREFIX_RE = /^https?:\/\//i;

export function getWebcalOrigin(request?: Pick<Request, "url">): string {
  if (request?.url) {
    return new URL(request.url).origin;
  }
  return Club.url;
}

export function createWebcalLink(path: string, origin: string = Club.url): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const host = origin.replace(HTTP_PROTOCOL_PREFIX_RE, "");

  return `webcal://${host}${normalizedPath}`;
}
