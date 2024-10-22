import {
  type Summary2OverrideConfig,
  type SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';

export const mapSelectedTypeToConfig = (
  newSelectedType: SummaryCustomTargetType,
  componentId: string,
): Summary2OverrideConfig => {
  return {
    displayType: newSelectedType,
    componentId,
  };
};
