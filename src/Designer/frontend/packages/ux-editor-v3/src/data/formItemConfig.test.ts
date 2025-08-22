import { formItemConfigs } from './formItemConfig';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

describe('formItemConfigs', () => {
  it('should have textResourceBindings and buttonStyle defined for ActionButton', () => {
    const actionButtonConfig = formItemConfigs[ComponentTypeV3.ActionButton];
    expect(actionButtonConfig).toBeDefined();

    const { defaultProperties } = actionButtonConfig;
    expect(defaultProperties).toBeDefined();
    expect(defaultProperties.textResourceBindings).toBeDefined();
    expect(defaultProperties.textResourceBindings.title).toBeDefined();
    expect(defaultProperties.buttonStyle).toBeDefined();
  });
});
