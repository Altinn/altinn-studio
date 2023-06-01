import React from 'react';
import {
  EditTextResourceBindings,
  EditTextResourceBindingsProps,
} from './EditTextResourceBindings';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import type { ITextResource } from 'app-shared/types/global';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ITextResourcesWithLanguage } from 'app-shared/types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { FormComponent } from '../../../types/FormComponent';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const addText = 'Legg til';
const searchText = 'Søk';
const texts: Record<string, string> = {
  'ux_editor.modal_text': 'Tekst',
  'general.add': addText,
  'general.search': searchText,
};
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('EditTextResourceBindings component', () => {
  const mockComponent: FormComponent = {
    id: 'test-id',
    textResourceBindings: {
      test: 'test-text',
    },
    type: ComponentType.Input,
    itemType: 'COMPONENT',
    dataModelBindings: {},
  };

  const textResources: ITextResource[] = [
    {
      id: 'test-text',
      value: 'This is a test',
    },
  ];

  test('that it renders with expected text resource binding keys', async () => {
    const textResourceBindingKeys = ['title', 'description', 'help'];
    await renderEditTextResourceBindingsComponent({ textResourceBindingKeys });
    textResourceBindingKeys.forEach((key) => {
      const label = screen.getByText(`ux_editor.modal_properties_textResourceBindings_${key}`);
      const placeholder = screen.getByText(
        `ux_editor.modal_properties_textResourceBindings_${key}_add`
      );
      expect(label).toBeInTheDocument();
      expect(placeholder).toBeInTheDocument();
    });
  });

  const renderEditTextResourceBindingsComponent = async ({
    component = mockComponent,
    handleComponentChange = () => {},
    textResourceBindingKeys = [],
  }: Partial<EditTextResourceBindingsProps>) => {
    const { result } = renderHookWithMockStore(
      {},
      {
        getTextLanguages: () => Promise.resolve(['nb', 'nn', 'en']),
        getTextResources: (_o, _a, lang) =>
          Promise.resolve<ITextResourcesWithLanguage>({
            language: lang,
            resources: textResources,
          }),
      }
    )(() => useTextResourcesQuery(org, app)).renderHookResult;
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    return renderWithMockStore()(
      <EditTextResourceBindings
        component={component}
        handleComponentChange={handleComponentChange}
        textResourceBindingKeys={textResourceBindingKeys}
      />
    );
  };
});
