import { useItemTitle } from './useItemTitle';
import { renderHookWithMockStore } from '../../../../testing/mocks';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { FormContainer } from '../../../../types/FormContainer';
import type { FormComponent } from '../../../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

// Test data:
const org = 'org';
const app = 'app';
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
    const expectedResult = textMock('ux_editor.component_group_header', { id });
    const container: FormContainer = { id, itemType: 'CONTAINER' };
    expect(result.current(container)).toBe(expectedResult);
  });

  it('Returns the component title when the item is a component with a given title', () => {
    const component: FormComponent = {
      id: 'a',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      textResourceBindings: { title: titleKey },
    };
    expect(result.current(component)).toBe(title);
  });

  it('Returns the component type name when the item is a component without a given title', () => {
    const type = ComponentType.Paragraph;
    const component: FormComponent = {
      id: 'a',
      type,
      itemType: 'COMPONENT',
    };
    expect(result.current(component)).toBe(textMock(`ux_editor.component_title.${type}`));
  });
});
