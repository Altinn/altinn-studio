import { renderHookWithMockStore } from '../testing/mocks';
import { useComponentErrorMessage } from './useComponentErrorMessage';
import type { FormComponent } from '../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '../../../../testing/mocks/i18nMock';

describe('useComponentErrorMessage', () => {
  it('Returns an error message from the translation file if the component is invalid', () => {
    const invalidComponent: FormComponent = {
      type: ComponentType.Checkboxes,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option1' },
      ],
      id: 'test',
      optionsId: '',
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };
    const { result } = renderHook(invalidComponent);
    expect(result.current).toEqual(textMock('ux_editor.checkboxes_error_DuplicateValues'));
  });

  it('Returns null if the component is valid', () => {
    const validComponent: FormComponent = {
      type: ComponentType.Checkboxes,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      id: 'test',
      optionsId: '',
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };
    const { result } = renderHook(validComponent);
    expect(result.current).toBeNull();
  });
});

const renderHook = (component: FormComponent) =>
  renderHookWithMockStore()(() => useComponentErrorMessage(component)).renderHookResult;
