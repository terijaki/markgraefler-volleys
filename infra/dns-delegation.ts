/// <reference path="./sst-reference.d.ts" />

import { DNS } from "@/project.config";

/**
 * Prod-only: delegate `new.markgraefler-volleys.de` to the dev account nameservers.
 * Hosted zones and ACM certs remain manually provisioned.
 */
export function createDevSubdomainDelegation() {
  const recordName = "new.markgraefler-volleys.de";
  const nameservers = DNS.dev.delegationNameservers.map((ns) => (ns.endsWith(".") ? ns : `${ns}.`));

  new aws.route53.Record("DevSubdomainDelegation", {
    zoneId: DNS.prod.hostedZoneId,
    name: recordName,
    type: "NS",
    ttl: 3600,
    records: nameservers,
  });
}
