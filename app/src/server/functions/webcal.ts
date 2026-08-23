import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { handleGetWebcalLink } from "./webcal.server";

export const getWebcalLinkFn = createServerFn()
  .validator(z.object({ path: z.string() }))
  .handler(async ({ data }) => handleGetWebcalLink(data.path));
