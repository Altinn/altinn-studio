import {
  type Summary2OverrideConfig,
  type OverrideDisplayType,
} from 'app-shared/types/ComponentSpecificConfig';

type SelectedTypeProps = {
  componentId: string;
  displayType: OverrideDisplayType;
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
