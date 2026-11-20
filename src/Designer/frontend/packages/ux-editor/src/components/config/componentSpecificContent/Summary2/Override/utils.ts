import {
  type Summary2OverrideConfig,
  type OverrideDisplayType,
} from '@altinn/ux-editor/types/Summary2Config';

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
