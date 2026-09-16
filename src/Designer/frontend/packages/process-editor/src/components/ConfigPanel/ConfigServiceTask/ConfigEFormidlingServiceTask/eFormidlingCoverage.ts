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

/**
 * The fields `AltinnEFormidlingConfiguration.Validate` refuses to run without. A value missing here
 * is not a warning the developer can postpone: the app throws `ApplicationConfigException` on
 * startup in the environment that lacks it.
 *
 * The order is the order the panel shows them in, so the list in the alert matches the fields.
 */
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

/**
 * The environments the app would fail to start in, with the fields that would stop it.
 *
 * Required-ness is per environment rather than per field: the runtime looks up the value for the
 * environment it is running in, so "is `type` configured?" has no answer and "is it configured for
 * production?" does. An environment with nothing missing is left out entirely.
 */
export const getEFormidlingCoverageGaps = (
  entries: RequiredEFormidlingEntries,
): EFormidlingCoverageGap[] => {
  // Resolved once per field rather than once per field and environment: the answer does not depend
  // on which environment is being asked about, and the panel asks fifteen times per render.
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

/**
 * The fields missing everywhere, when every environment is short of exactly the same ones - which
 * is what a task the palette has just created looks like, and what an edit to a value that applies
 * to every environment leaves behind.
 *
 * `undefined` when the environments differ, and the panel names them one by one instead. Saying
 * the same five field names three times over would be the loudest thing on a panel nobody has
 * filled in yet, and it would say nothing the one line does not.
 */
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

/**
 * `securityLevel` is read with `int.TryParse` and `GetRequiredIntConfig` fails the startup on a
 * value that is not a whole number just as it does on a missing one, so the panel counts both as
 * the same gap. The others only have to be non-blank, which is all `GetRequiredConfig` asks.
 */
const hasUsableValue = (
  property: RequiredEFormidlingProperty,
  resolved: ResolvedEnvironmentEntries<string>,
  environment: AltinnEnvironment,
): boolean => {
  const value = getEffectiveEnvironmentValue(resolved, environment) ?? '';
  return property === 'securityLevel' ? isIntegerValue(value) : !!value.trim();
};
