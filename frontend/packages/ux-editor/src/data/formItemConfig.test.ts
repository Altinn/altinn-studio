import { formItemConfigs } from './formItemConfig';
import { ComponentType } from 'app-shared/types/ComponentType';

describe('formItemConfigs', () => {
    it('should have textResourceBindings and buttonStyle defined for ActionButton', () => {
        const actionButtonConfig = formItemConfigs[ComponentType.ActionButton];
        expect(actionButtonConfig).toBeDefined();

        const { defaultProperties } = actionButtonConfig;
        expect(defaultProperties).toBeDefined();
        expect(defaultProperties.textResourceBindings).toBeDefined();
        expect(defaultProperties.textResourceBindings.title).toBeDefined();
        expect(defaultProperties.buttonStyle).toBeDefined();
    });
});
