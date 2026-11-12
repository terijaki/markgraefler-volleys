import type { AnchorProps } from "@mantine/core";
import { Anchor, Group, Text } from "@mantine/core";
import { MapPin } from "lucide-react";
import { useMemo } from "react";

interface MapsLinkProps extends Omit<AnchorProps, "href" | "component" | "target"> {
  street?: string | null;
  postal?: string | null;
  city?: string | null;
  name?: string | null;
}

function buildMapsAddressString({
  name,
  street,
  postal,
  city,
}: Pick<MapsLinkProps, "name" | "street" | "postal" | "city">): string {
  let addressString = "";
  if (name) addressString += `${name}, `;
  if (street) addressString += street;
  if (street && (postal || city)) addressString += ", ";
  if (postal) addressString += `${postal}`;
  if (postal && city) addressString += " ";
  if (city) addressString += `${city}`;
  return addressString;
}

function isAppleMapsPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  function hasUserAgentData(
    n: Navigator,
  ): n is Navigator & { userAgentData: { platform: string } } {
    return (
      "userAgentData" in n &&
      typeof (n as { userAgentData?: { platform?: string } }).userAgentData?.platform === "string"
    );
  }
  if (hasUserAgentData(navigator)) {
    return /iPhone|iPad|iPod|Mac/.test(navigator.userAgentData.platform);
  }
  if (navigator.userAgent) {
    return /iPhone|iPad|iPod|Mac/.test(navigator.userAgent);
  }
  return false;
}

export default function MapsLink({ street, postal, city, name, ...anchorProps }: MapsLinkProps) {
  const mapsUrl = useMemo(() => {
    const addressString = buildMapsAddressString({ name, street, postal, city });
    if (!addressString.trim()) return null;

    if (isAppleMapsPlatform()) {
      return `https://maps.apple.com/?q=${encodeURIComponent(addressString)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
  }, [street, postal, city, name]);

  const displayName = name || city;

  if (!mapsUrl) return <>{displayName}</>;

  return (
    <Anchor
      component="a"
      href={mapsUrl}
      underline="never"
      target="_blank"
      rel="noopener noreferrer"
      {...anchorProps}
    >
      <Group gap={4} wrap="nowrap" align="center">
        <MapPin size={14} style={{ flexShrink: 0 }} />
        <Text lineClamp={1} style={{ wordBreak: "break-all" }}>
          {displayName}
        </Text>
      </Group>
    </Anchor>
  );
}
