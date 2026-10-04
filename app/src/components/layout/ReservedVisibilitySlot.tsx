import { Box } from "@mantine/core";
import type { ReactNode } from "react";

type ReservedVisibilitySlotProps = {
  visible: boolean;
  children: ReactNode;
};

/** Keeps layout space while hiding content (visibility:hidden + inert). */
export default function ReservedVisibilitySlot({ visible, children }: ReservedVisibilitySlotProps) {
  return (
    <Box
      aria-hidden={!visible}
      {...(!visible ? { inert: true } : {})}
      style={{
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {children}
    </Box>
  );
}
