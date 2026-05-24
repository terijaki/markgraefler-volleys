import { createTheme, type MantineColorsTuple } from "@mantine/core";

const mvPurple: MantineColorsTuple = [
  "#f1ebf8",
  "#e2d3f3",
  "#ccb0ea",
  "#b58ce0",
  "#9f6fd4",
  "#8e5fc6",
  "#7c4fb3",
  "#6f469f",
  "#5d3a8a",
  "#492d6c",
];

const mvGreen: MantineColorsTuple = [
  "#edf4ea",
  "#d9e8d2",
  "#b7d2a9",
  "#94bc80",
  "#72a65b",
  "#578743",
  "#2f5d1e",
  "#2a541b",
  "#234716",
  "#1b3610",
];

const mvInk: MantineColorsTuple = [
  "#f0eef2",
  "#d8d3dc",
  "#beb8c4",
  "#a49cae",
  "#8b8297",
  "#71697e",
  "#564f62",
  "#403a49",
  "#2b2631",
  "#1c1b1f",
];

const mvSand: MantineColorsTuple = [
  "#faf8f4",
  "#f0ece5",
  "#e4ddd1",
  "#d8cebe",
  "#cdc3b2",
  "#c9c1b3",
  "#b4ac9f",
  "#978f82",
  "#766f63",
  "#564f44",
];

const mvBg: MantineColorsTuple = [
  "#f9f8f6",
  "#f7f6f3",
  "#f3f1ec",
  "#ebe7dd",
  "#e2ddd1",
  "#d6cfc1",
  "#c6beaf",
  "#a89f90",
  "#867d71",
  "#61594d",
];

const mvAmber: MantineColorsTuple = [
  "#fbf1d8",
  "#f9e6b8",
  "#f5d78e",
  "#f0c763",
  "#e9b43f",
  "#df9d18",
  "#c7840e",
  "#975f0b",
  "#643f08",
  "#322004",
];

export const theme = createTheme({
  colors: { mvPurple, mvGreen, mvInk, mvSand, mvBg, mvAmber },
  primaryShade: 6,
  primaryColor: "mvPurple",
  fontFamily: "Manrope, Source Sans 3, Helvetica Neue, sans-serif",
  fontFamilyMonospace: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "Sora, Space Grotesk, Manrope, sans-serif",
    fontWeight: "800",
  },
  radius: {
    xs: "10px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
  },
  defaultRadius: "md",
  components: {
    Title: {
      defaultProps: {
        c: "mvPurple.8",
      },
    },
    Anchor: {
      defaultProps: {
        c: "mvGreen",
      },
    },
    AppShell: {
      defaultProps: {
        bg: "mvBg",
      },
    },
    Button: {
      defaultProps: {
        radius: "xl",
        size: "md",
      },
      styles: {
        root: {
          border: "2px solid var(--mantine-color-mvInk-9)",
          boxShadow: "0 8px 0 rgba(28, 27, 31, 0.28)",
          fontWeight: 700,
          transition: "transform 140ms ease, box-shadow 140ms ease",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        withBorder: true,
      },
      styles: {
        root: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
          boxShadow: "0 8px 0 rgba(28, 27, 31, 0.28)",
        },
      },
    },
    TextInput: {
      defaultProps: { size: "md", radius: "md" },
      styles: {
        input: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
          backgroundColor: "white",
        },
      },
    },
    Textarea: {
      defaultProps: { size: "md", radius: "md" },
      styles: {
        input: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
          backgroundColor: "white",
        },
      },
    },
    Select: {
      defaultProps: { size: "md", radius: "md" },
      styles: {
        input: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
          backgroundColor: "white",
        },
      },
    },
    MultiSelect: {
      defaultProps: { size: "md", radius: "md" },
      styles: {
        input: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
          backgroundColor: "white",
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          border: "2px solid var(--mantine-color-mvInk-9)",
          backgroundColor: "var(--mantine-color-white)",
        },
      },
    },
    Checkbox: {
      styles: {
        input: {
          borderWidth: "2px",
          borderColor: "var(--mantine-color-mvInk-9)",
        },
      },
    },
    Loader: {
      defaultProps: {
        type: "dots",
        size: "lg",
      },
    },
    Skeleton: {
      defaultProps: {
        radius: "md",
      },
    },
    PinInput: { defaultProps: { size: "md" } },
    DateInput: { defaultProps: { size: "md" } },
    DateTimePicker: { defaultProps: { size: "md" } },
    DatePickerInput: { defaultProps: { size: "md" } },
    TimeInput: { defaultProps: { size: "md" } },
  },
});
