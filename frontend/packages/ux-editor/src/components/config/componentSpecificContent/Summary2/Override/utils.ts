import {
  type Summary2OverrideConfig,
  type SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';

type SelectedTypeProps = {
  componentId: string;
  displayType: SummaryCustomTargetType;
};

export const mapSelectedTypeToConfig = ({
  componentId,
  displayType,
}: SelectedTypeProps): Summary2OverrideConfig => {
  return {
    displayType,
    componentId,
  };
};
