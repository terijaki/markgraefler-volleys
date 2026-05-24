import { Container, Stack } from "@mantine/core";
import CenteredLoader from "../CenteredLoader";
import PageHeading from "./PageHeading";

interface PageMetadataProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
}

interface PageWithHeadingProps extends PageMetadataProps {
  // PageHeading props
  subtitle?: string;
  date?: Date;
  // PageWithHeading specific
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function PageWithHeading({
  children,
  isLoading,
  title,
  subtitle,
  date,
}: PageWithHeadingProps) {
  return (
    <Stack pb="md" bg="mvBg" align="stretch">
      <Container size="xl" px={{ base: "lg", md: "xl" }} pt="xl" w="100%">
        <Stack gap="sm">
          <PageHeading title={title ?? ""} subtitle={subtitle} date={date} />
          {isLoading ? <CenteredLoader text="Lade Buchungen..." /> : children}
        </Stack>
      </Container>
    </Stack>
  );
}
