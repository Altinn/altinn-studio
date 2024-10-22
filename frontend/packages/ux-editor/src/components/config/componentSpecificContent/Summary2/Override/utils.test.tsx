import { mapSelectedTypeToConfig } from './utils';
import {
  type Summary2OverrideConfig,
  type SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';

//Test data
const stringSelectedType: SummaryCustomTargetType = 'string';
const listSelectedType: SummaryCustomTargetType = 'list';
const notSetSelectedType: SummaryCustomTargetType = 'notSet';

describe('mapSelectedTypeToConfig', () => {
  it('should map selected string type to config correctly', () => {
    const newSelectedType: SummaryCustomTargetType = stringSelectedType;
    const componentId = 'component123';
    const expectedConfig: Summary2OverrideConfig = {
      displayType: newSelectedType,
      componentId,
    };

    const result = mapSelectedTypeToConfig(newSelectedType, componentId);

    expect(result).toEqual(expectedConfig);
  });

  it('should map selected list type to config correctly', () => {
    const newSelectedType: SummaryCustomTargetType = listSelectedType;
    const componentId = 'component456';
    const expectedConfig: Summary2OverrideConfig = {
      displayType: newSelectedType,
      componentId,
    };

    const result = mapSelectedTypeToConfig(newSelectedType, componentId);

    expect(result).toEqual(expectedConfig);
  });

  it('should map selected notSet type to config correctly', () => {
    const newSelectedType: SummaryCustomTargetType = notSetSelectedType;
    const componentId = 'component789';
    const expectedConfig: Summary2OverrideConfig = {
      displayType: newSelectedType,
      componentId,
    };

    const result = mapSelectedTypeToConfig(newSelectedType, componentId);

    expect(result).toEqual(expectedConfig);
  });
});
