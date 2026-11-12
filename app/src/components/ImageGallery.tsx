import { AspectRatio, Card, Group, Image } from "@mantine/core";
import { useMemo, useState } from "react";

/** Deterministic Fisher–Yates shuffle so gallery order stays stable across re-renders. */
function shuffleImageUrls(urls: string[]): string[] {
  const shuffled = [...urls];
  let seed = urls.reduce((hash, url) => hash + url.length, 0);
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ImageGallery({ images }: { images?: string[] }) {
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const shuffledGallery = useMemo(
    () => (images && images.length > 0 ? shuffleImageUrls(images) : []),
    [images],
  );

  if (!images || images.length === 0) return null;

  return (
    <Group gap="xs" justify="flex-start" preventGrowOverflow={false} mt="md">
      {shuffledGallery.map((imageUrl: string, index) => {
        return (
          <AspectRatio
            key={imageUrl}
            ratio={16 / 9}
            w={{ base: "100%", xs: 264 }}
            h={{ base: undefined, xs: (264 / 16) * 9 }}
          >
            <Card
              shadow="sm"
              component="a"
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setIsHovered(imageUrl)}
              onMouseLeave={() => setIsHovered(null)}
            >
              <Card.Section>
                <Image
                  src={imageUrl}
                  alt={`Foto ${index}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 8,
                    transition: "transform 0.5s ease",
                    transform: isHovered === imageUrl ? "scale(1.03)" : undefined,
                  }}
                />
              </Card.Section>
            </Card>
          </AspectRatio>
        );
      })}
    </Group>
  );
}
