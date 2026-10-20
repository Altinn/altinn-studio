import { ArrayUtils } from '@studio/pure-functions';
import type {
  AltinnEnvironment,
  EnvironmentEntry,
  ResolvedEnvironmentEntries,
} from '../../EnvironmentConfig';
import {
  altinnEnvironments,
  getEffectiveEnvironmentValue,
  isIntegerValue,
  resolveEnvironmentEntries,
} from '../../EnvironmentConfig';

/** Fields required by AltinnEFormidlingConfiguration.Validate, in panel order. */
export const requiredEFormidlingProperties = [
  'process',
  'standard',
  'type',
  'typeVersion',
  'securityLevel',
] as const;

export type RequiredEFormidlingProperty = (typeof requiredEFormidlingProperties)[number];

export type RequiredEFormidlingEntries = Record<
  RequiredEFormidlingProperty,
  EnvironmentEntry<string>[]
>;

export type EFormidlingCoverageGap = {
  environment: AltinnEnvironment;
  missingProperties: RequiredEFormidlingProperty[];
};

/** Returns missing or invalid required fields for each environment. */
export const getEFormidlingCoverageGaps = (
  entries: RequiredEFormidlingEntries,
): EFormidlingCoverageGap[] => {
  const resolvedEntries = resolveRequiredEntries(entries);

  return altinnEnvironments
    .map((environment) => ({
      environment,
      missingProperties: requiredEFormidlingProperties.filter(
        (property) => !hasUsableValue(property, resolvedEntries[property], environment),
      ),
    }))
    .filter(({ missingProperties }) => missingProperties.length > 0);
};

/** The fields missing in every environment, or `undefined` when the environments differ. */
export const getUniversalCoverageGap = (
  gaps: EFormidlingCoverageGap[],
): RequiredEFormidlingProperty[] | undefined => {
  if (gaps.length < altinnEnvironments.length) return undefined;
  const [{ missingProperties }] = gaps;
  const isSharedByAll = gaps.every((gap) =>
    ArrayUtils.arraysEqualUnordered(gap.missingProperties, missingProperties),
  );
  return isSharedByAll ? missingProperties : undefined;
};

type ResolvedRequiredEntries = Record<
  RequiredEFormidlingProperty,
  ResolvedEnvironmentEntries<string>
>;

const resolveRequiredEntries = (entries: RequiredEFormidlingEntries): ResolvedRequiredEntries =>
  Object.fromEntries(
    requiredEFormidlingProperties.map((property) => [
      property,
      resolveEnvironmentEntries(entries[property]),
    ]),
  ) as ResolvedRequiredEntries;

/** `securityLevel` is read with `int.TryParse`; the other fields only have to be non-blank. */
const hasUsableValue = (
  property: RequiredEFormidlingProperty,
  resolved: ResolvedEnvironmentEntries<string>,
  environment: AltinnEnvironment,
): boolean => {
  const value = getEffectiveEnvironmentValue(resolved, environment) ?? '';
  return property === 'securityLevel' ? isIntegerValue(value) : !!value.trim();
};
