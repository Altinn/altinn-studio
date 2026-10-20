import type { AnySummaryOverride } from '@app/layout-contract/generated/common.generated';
import type { CompSummary2Serialized } from '@app/layout-contract/generated/components/Summary2/serialized.generated';

type SerializedSummaryTarget = NonNullable<CompSummary2Serialized['target']>;

export type SummaryTargetType = NonNullable<SerializedSummaryTarget['type']>;

/** Incomplete target while the user is choosing its discriminator and identifier. */
export type Summary2TargetConfig = {
  type?: SummaryTargetType;
  id?: string;
  taskId?: string;
};

type SerializedComponentOverride = Extract<AnySummaryOverride, { componentId: string }>;
type PropertyOfUnion<T, Key extends PropertyKey> = T extends unknown
  ? Key extends keyof T
    ? T[Key]
    : never
  : never;

export type OverrideDisplayType = NonNullable<
  PropertyOfUnion<SerializedComponentOverride, 'displayType'>
>;
export type OverrideDisplay = NonNullable<PropertyOfUnion<SerializedComponentOverride, 'display'>>;

/** Component override assembled incrementally by the Summary configuration UI. */
export type Summary2OverrideConfig = {
  componentId: string;
  hidden?: PropertyOfUnion<SerializedComponentOverride, 'hidden'>;
  emptyFieldText?: PropertyOfUnion<SerializedComponentOverride, 'emptyFieldText'>;
  isCompact?: PropertyOfUnion<SerializedComponentOverride, 'isCompact'>;
  displayType?: OverrideDisplayType;
  display?: OverrideDisplay;
};
