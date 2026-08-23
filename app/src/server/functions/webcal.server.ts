import { getRequest } from "@tanstack/react-start/server";
import { createWebcalLink, getWebcalOrigin } from "@webapp/utils/webcal";

export async function handleGetWebcalLink(path: string): Promise<string> {
  return createWebcalLink(path, getWebcalOrigin(getRequest()));
}
