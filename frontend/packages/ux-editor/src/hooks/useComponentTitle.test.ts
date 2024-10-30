import { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { useComponentTitle } from './useComponentTitle';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderHookWithProviders } from '../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { FormContainer } from '../types/FormContainer';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { FormComponent } from '../types/FormComponent';

// Test data:
const title = 'En tittel';
const titleKey = 'titleKey';
const titleTextResource: ITextResource = {
  id: titleKey,
  value: title,
};
const textResources: ITextResources = {
  [DEFAULT_LANGUAGE]: [titleTextResource],
};

describe('useComponentTypeName', () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  const result = renderHookWithProviders(useComponentTitle, { queryClient }).result;

  it('returns the title for a container when item is of type "CONTAINER"', () => {
    const container: FormContainer = { id: '1', itemType: 'CONTAINER', type: ComponentType.Group };

    const expectedResult = textMock(`ux_editor.component_title.${container.type}`);
    expect(result.current(container)).toBe(expectedResult);
  });

  it('returns the component title from text resources when it is specified', () => {
    const componentWithTextResourceTitle: FormComponent = {
      id: 'a',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      textResourceBindings: { title: titleKey },
    };

    expect(result.current(componentWithTextResourceTitle)).toBe(title);
  });

  it('returns the default component type title when title is missing in text resources', () => {
    const componentWithoutTextResourceTitle: FormComponent = {
      id: 'a',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
    };

    const expectedResult = textMock(`ux_editor.component_title.${ComponentType.Paragraph}`);
    expect(result.current(componentWithoutTextResourceTitle)).toBe(expectedResult);
  });

  it('returns the default component type title when title is empty in text resources', () => {
    const componentWithEmptyTextResourceTitle: FormComponent = {
      id: 'a',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      textResourceBindings: { title: '' },
    };

    const expectedResult = textMock(`ux_editor.component_title.${ComponentType.Paragraph}`);
    expect(result.current(componentWithEmptyTextResourceTitle)).toBe(expectedResult);
  });

  it('returns the custom component type title when custom action bindings are present', () => {
    const componentWithCustomAction: FormComponent = {
      id: 'a',
      type: ComponentType.CustomButton,
      itemType: 'COMPONENT',
      actions: [
        {
          type: 'ClientAction',
          id: 'closeSubform',
        },
      ],
      buttonStyle: 'primary',
    };

    const expectedResult = textMock(
      `ux_editor.component_title.${CustomComponentType.CloseSubformButton}`,
    );
    expect(result.current(componentWithCustomAction)).toBe(expectedResult);
  });

  it('returns the default button type title when custom action bindings do not meet requirements', () => {
    const componentWithoutActionRequirements: FormComponent = {
      id: 'a',
      type: ComponentType.CustomButton,
      itemType: 'COMPONENT',
      actions: [],
      buttonStyle: 'primary',
    };

    const expectedResult = textMock(`ux_editor.component_title.${ComponentType.CustomButton}`);
    expect(result.current(componentWithoutActionRequirements)).toBe(expectedResult);
  });
});
