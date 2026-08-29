type MatchLocationAddress =
  | string
  | {
      street?: string;
      postcode?: string;
      city?: string;
    }
  | null
  | undefined;

/** Normalize projection/API location address (string or structured) for display components. */
export function matchLocationAddressParts(address: MatchLocationAddress): {
  street?: string;
  postal?: string;
  city?: string;
} {
  if (!address) return {};
  if (typeof address === "string") return { street: address };
  return {
    street: address.street,
    postal: address.postcode,
    city: address.city,
  };
}
