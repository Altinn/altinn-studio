import { useItemTitle } from './useItemTitle';
import { renderHookWithMockStore } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormContainer } from '../../../../types/FormContainer';
import type { FormComponent } from '../../../../types/FormComponent';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

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

describe('useItemTitle', () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  const { result } = renderHookWithMockStore({}, {}, queryClient)(useItemTitle).renderHookResult;

  it('Returns the correct title when the item is a container', () => {
    const id = '1';
    const container: FormContainer = { id, itemType: 'CONTAINER', type: ComponentTypeV3.Group };
    const expectedResult = textMock(`ux_editor.component_title.${container.type}`);
    expect(result.current(container)).toBe(expectedResult);
  });

  it('Returns the component title when the item is a component with a given title', () => {
    const component: FormComponent = {
      id: 'a',
      type: ComponentTypeV3.Paragraph,
      itemType: 'COMPONENT',
      textResourceBindings: { title: titleKey },
    };
    expect(result.current(component)).toBe(title);
  });

  it('Returns the component type name when the item is a component without a given title', () => {
    const type = ComponentTypeV3.Paragraph;
    const component: FormComponent = {
      id: 'a',
      type,
      itemType: 'COMPONENT',
    };
    expect(result.current(component)).toBe(textMock(`ux_editor.component_title.${type}`));
  });
});
