import { Camera as InstagramIcon } from "lucide-react";
import { Instagram } from "@project.config";

export default function socialList() {
  const socials = [
    {
      name: "Instagram",
      href: `https://www.instagram.com/${Instagram.mainAccount}`,
      icon: <InstagramIcon />,
      target: "_blank",
      rel: "noreferrer",
    },
  ];
  return socials;
}
