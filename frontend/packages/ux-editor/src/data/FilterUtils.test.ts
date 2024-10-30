import { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs } from './formItemConfig';
import { FilterUtils } from './FilterUtils';

describe('FilterUtils', () => {
  describe('filterOutDisabledFeatureItems', () => {
    it('should return false if the primitive false is passed as argument', () => {
      expect(FilterUtils.filterOutDisabledFeatureItems(false)).toBe(false);
    });

    it('should return true of component is passed as argument', () => {
      expect(
        FilterUtils.filterOutDisabledFeatureItems(formItemConfigs[ComponentType.FileUpload]),
      ).toBe(true);
    });
  });

  describe('filterUnsupportedSubformComponents', () => {
    it.each([
      {
        component: formItemConfigs[ComponentType.Button],
      },
      {
        component: formItemConfigs[ComponentType.FileUpload],
      },
      {
        component: formItemConfigs[ComponentType.FileUploadWithTag],
      },
      {
        component: formItemConfigs[ComponentType.InstantiationButton],
      },
      {
        component: formItemConfigs[ComponentType.Payment],
      },
      {
        component: formItemConfigs[ComponentType.Subform],
      },
    ])(
      'should return false for unsupported subform component: $component.name',
      ({ component }) => {
        expect(FilterUtils.filterUnsupportedSubformComponents(component)).toBe(false);
      },
    );

    it('should return true for supported components', () => {
      const supportedComponent = formItemConfigs[ComponentType.Alert];
      expect(FilterUtils.filterUnsupportedSubformComponents(supportedComponent)).toBe(true);
    });
  });
});
