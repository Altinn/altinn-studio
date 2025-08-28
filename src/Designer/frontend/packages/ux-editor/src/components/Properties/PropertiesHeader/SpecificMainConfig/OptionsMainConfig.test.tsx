import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { OptionsMainConfig } from './OptionsMainConfig';
import type { FormItem } from '../../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';

const optionsComponent: FormItem = {
  id: '0',
  type: ComponentType.Checkboxes,
  itemType: 'COMPONENT',
  target: {},
  dataModelBindings: {
    simpleBinding: { field: 'simpleBinding', dataType: '' },
  },
};

describe('ComponentMainConfig', () => {
  describe('Options', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render options config', async () => {
      render(optionsComponent);
      expect(screen.getByText(textMock('ux_editor.options.section_heading'))).toBeInTheDocument();
    });

    it('should call handleComponentChange when changing target', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      render(optionsComponent, handleComponentChange);
      await user.click(await referenceTab());
      await user.type(referenceIdInput(), 't');
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });
  });
});

const referenceTab = async () =>
  await screen.findByRole('tab', { name: textMock('ux_editor.options.tab_reference_id') });
const referenceIdInput = () =>
  screen.getByRole('textbox', { name: textMock('ux_editor.modal_properties_custom_code_list_id') });

const render = (
  component: FormItem<ComponentType.Checkboxes>,
  handleComponentChange: (component: FormItem<SelectionComponentType>) => void = jest.fn(),
) => {
  renderWithProviders(
    <OptionsMainConfig component={component} handleComponentChange={handleComponentChange} />,
  );
};
