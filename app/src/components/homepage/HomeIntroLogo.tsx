import { Image } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";

export default function HomeIntroLogo() {
  const router = useRouter();

  return (
    <Image
      className="mv-card mv-pressable"
      p="md"
      fit="contain"
      w={{ base: "100%", xs: "70%", sm: "56%", md: "50%", lg: "44%" }}
      mah="32vh"
      src={"/assets/logos/logo-000000-500.png"}
      alt="Vereinslogo"
      bg="white"
      onContextMenu={(e) => {
        e.preventDefault();
        router.navigate({ to: "/brand" });
      }}
    />
  );
}
