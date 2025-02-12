import { mapSelectedTypeToConfig } from './utils';
import {
  type Summary2OverrideConfig,
  type SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';

//Test data
const stringSelectedType: SummaryCustomTargetType = 'string';
const listSelectedType: SummaryCustomTargetType = 'list';
const componentId = 'component123';

describe('mapSelectedTypeToConfig', () => {
  it('should map selected string type to config correctly', () => {
    const expectedConfig: Summary2OverrideConfig = {
      displayType: stringSelectedType,
      componentId,
    };
    const result = mapSelectedTypeToConfig({ displayType: stringSelectedType, componentId });
    expect(result).toEqual(expectedConfig);
  });

  it('should map selected list type to config correctly', () => {
    const expectedConfig: Summary2OverrideConfig = {
      displayType: listSelectedType,
      componentId,
    };
    const result = mapSelectedTypeToConfig({ displayType: listSelectedType, componentId });

    expect(result).toEqual(expectedConfig);
  });
});
