import {
  type Summary2OverrideConfig,
  type SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';

export const mapSelectedTypeToConfig = (
  newSelectedType: SummaryCustomTargetType,
  componentId: string,
): Summary2OverrideConfig => {
  if (newSelectedType === 'notSet') return { componentId: componentId };
  return {
    displayType: newSelectedType,
    componentId,
  };
};
