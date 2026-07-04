import { AspectRatio, Box, Card, Image, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { BeholdPost } from "@/lambda/social/types";
import { useMediaQuery } from "@mantine/hooks";

// The layout (and thus the shape of the media box) is already decided per
// group via `isPortrait`, so every card in the group uses the same simple
// ratio rather than each post's own measured aspect ratio — keeping the
// group visually consistent instead of a slightly different height per card.
const PORTRAIT_MEDIA_RATIO = 4 / 5;
const LANDSCAPE_MEDIA_RATIO = 16 / 9;

// The card also needs its own explicit width (rather than stretching to fill
// a grid column) — otherwise a "portrait" card ends up wider than it is
// tall whenever the column happens to be wide, producing a landscape-shaped
// box despite the vertical stacking. The parent lays cards out in a
// wrapping Group so these fixed widths can sit side by side.
const PORTRAIT_CARD_WIDTH = 200;
const LANDSCAPE_CARD_WIDTH = 380;
const LANDSCAPE_MEDIA_WIDTH = 200;

interface InstagramCardProps {
  post: BeholdPost;
  postIndex: number;
  /** Whether this card should render as a full-width stacked portrait card
   * instead of a compact side-by-side landscape card. Decided by the parent
   * for the whole group, so mixed portrait/landscape posts don't produce
   * inconsistently shaped cards. */
  isPortrait: boolean;
}

export default function InstagramCard({ post, postIndex, isPortrait }: InstagramCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDesktop = useMediaQuery("(min-width: 64em)");

  const {
    id,
    prunedCaption,
    sizes,
    permalink,
    hashtags,
    mediaType,
    mediaUrl,
    thumbnailUrl,
    altText,
  } = post;

  const isVideo = mediaType === "VIDEO";
  const mediaAspectRatio = isPortrait ? PORTRAIT_MEDIA_RATIO : LANDSCAPE_MEDIA_RATIO;
  // Let the browser pick the best-fitting resolution instead of always
  // loading the (often blurry when upscaled) small thumbnail.
  const mediaSrcSet = [sizes.small, sizes.medium, sizes.large, sizes.full]
    .map((size) => `${size.mediaUrl} ${size.width}w`)
    .join(", ");
  const mediaDisplayWidth = isPortrait ? PORTRAIT_CARD_WIDTH : LANDSCAPE_MEDIA_WIDTH;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && videoLoaded) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current?.paused) {
      videoRef.current.play();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHovered && !video.paused) {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <Card
      visibleFrom={postIndex > 1 ? "md" : undefined}
      component="a"
      href={permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="mv-pressable mv-focus"
      radius="lg"
      padding={0}
      maw={{ base: undefined, xs: isPortrait ? PORTRAIT_CARD_WIDTH : LANDSCAPE_CARD_WIDTH }}
      orientation={isPortrait ? "vertical" : "horizontal"}
      // In the horizontal (landscape) layout, default flex stretch would
      // force the media box taller than its own aspect ratio whenever the
      // caption needs more height, leaving a blank gap under the image.
      style={isPortrait ? undefined : { alignItems: "flex-start" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      data-post-id={id}
      bg="white"
    >
      <Box my={isDesktop ? "-lg" : undefined}>
        <AspectRatio
          ratio={mediaAspectRatio}
          pos="relative"
          w={isPortrait ? "100%" : LANDSCAPE_MEDIA_WIDTH}
          style={{ overflow: "hidden", flexShrink: 0 }}
        >
          {isVideo && (
            <video
              ref={videoRef}
              src={mediaUrl}
              muted
              loop
              playsInline
              poster={thumbnailUrl || sizes.medium.mediaUrl || sizes.small.mediaUrl}
              controls={false}
              onClick={handleVideoClick}
              onLoadedData={() => setVideoLoaded(true)}
              onError={() => setVideoLoaded(false)}
              preload="auto"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1,
                objectFit: "cover",
                opacity: isHovered && videoLoaded ? 1 : 0,
                transition: "opacity 180ms ease",
                cursor: "pointer",
              }}
            />
          )}
          <Image
            src={sizes.medium.mediaUrl}
            srcSet={mediaSrcSet}
            sizes={`(min-width: 36em) ${mediaDisplayWidth}px, 100vw`}
            alt={altText || ""}
            fit="cover"
            style={{
              transition: "transform 180ms ease",
              transform: isHovered ? "scale(1.03)" : undefined,
            }}
          />
        </AspectRatio>
      </Box>
      <Stack bg="white" justify="space-between" h="100%" p="xs" gap={0} style={{ zIndex: 90 }}>
        <Text lineClamp={6} c="mvInk.9" size="md">
          {prunedCaption}
        </Text>
        {hashtags.length > 0 && (
          <Text size="xs" fw="bold" c="mvGreen.8">
            {hashtags.map((h) => `#${h}`).join(" ")}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
