import { Title, type TitleProps } from "@mantine/core";

export default function CardTitle(props: TitleProps) {
  const mergedStyle = {
    fontSize: "clamp(1.2rem, 1.8vw, 1.65rem)",
    lineHeight: 1.14,
    letterSpacing: "-0.014em",
    ...(props.style ?? {}),
  };

  return (
    <Title order={4} fw={800} c={props.c ?? "mvPurple.8"} {...props} style={mergedStyle}>
      {props.children}
    </Title>
  );
}
