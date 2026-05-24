import { FaInstagram } from "react-icons/fa6";
import { Instagram } from "@project.config";

export default function socialList() {
  const socials = [
    {
      name: "Instagram",
      href: `https://www.instagram.com/${Instagram.mainAccount}`,
      icon: <FaInstagram />,
      target: "_blank",
      rel: "noreferrer",
    },
  ];
  return socials;
}
