import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { isProductionHost } from 'src/utils/urls/urlHelper';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

type InstantiationPreconditions = Pick<
  IncomingApplicationMetadata,
  'validFrom' | 'validTo' | 'disallowUserInstantiation'
>;

export type InstantiationClosedReason = { reason: 'notYetOpen'; opensAt: Date } | { reason: 'closed' };

// The app backend reads a validity date without an offset as UTC, while JavaScript reads a date-time without an
// offset as local time.
const hasTimeWithoutOffset = /T[^Z+-]*$/i;

function parseValidityDate(value: string): Date {
  return new Date(hasTimeWithoutOffset.test(value) ? `${value}Z` : value);
}

/**
 * Mirrors the checks the app backend does before creating an instance, so that we can tell the user why the service
 * cannot be started instead of sending a request we know will be rejected. The backend responds with 410 Gone in
 * every case. Service owners are exempt from disallowUserInstantiation, but they do not use the app frontend.
 *
 * An unparsable validity date is left for the backend to judge.
 */
export function getInstantiationClosedReason(
  { validFrom, validTo, disallowUserInstantiation }: InstantiationPreconditions,
  now: Date,
  host: string,
): InstantiationClosedReason | undefined {
  if (validFrom) {
    const opensAt = parseValidityDate(validFrom);
    if (opensAt.getTime() > now.getTime()) {
      return { reason: 'notYetOpen', opensAt };
    }
  }

  if (validTo && parseValidityDate(validTo).getTime() < now.getTime()) {
    return { reason: 'closed' };
  }

  // The app backend only enforces disallowUserInstantiation in production, so that apps can still be tried out in
  // test environments. Mirror that here, or the frontend would block instantiation where the backend allows it.
  if (disallowUserInstantiation && isProductionHost(host)) {
    return { reason: 'closed' };
  }

  return undefined;
}

/**
 * The app backend responds with 410 Gone when it refuses to create an instance because the service is closed, see
 * getInstantiationClosedReason for the conditions.
 */
export function isInstantiationClosedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === HttpStatusCodes.Gone;
}

export function useInstantiationClosedReason(): InstantiationClosedReason | undefined {
  const applicationMetadata = useApplicationMetadata();
  return getInstantiationClosedReason(applicationMetadata, new Date(), window.location.host);
}
