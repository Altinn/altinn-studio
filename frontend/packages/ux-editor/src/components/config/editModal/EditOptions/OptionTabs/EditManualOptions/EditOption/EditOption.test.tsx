import React from 'react';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import type { EditOptionProps } from './EditOption';
import { EditOption } from './EditOption';
import { screen, within } from '@testing-library/react';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { app, org } from '@studio/testing/testids';

// Test data:
const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];
const legend = 'Test label';
const onDelete = jest.fn();
const onChange = jest.fn();
const label = textResources[0].id;
const value = 'Option value';
const option = { label, value };
const defaultProps: EditOptionProps = {
  legend,
  onDelete,
  onChange,
  option,
};

describe('EditOption', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a button with the given legend as label', () => {
    renderEditOption();
    screen.getByRole('button', { name: legend });
  });

  it('Renders the text of the option label', () => {
    renderEditOption();
    expect(screen.getByRole('button', { name: legend })).toHaveTextContent(textResources[0].value);
  });

  it('Opens a fieldset with the given legend when the button is clicked', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    screen.getByRole('group', { name: legend });
  });

  it('Displays a text field with the value of the option in the fieldset', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    const fieldset = screen.getByRole('group', { name: legend });
    const textField = within(fieldset).getByRole('textbox', { name: textMock('general.value') });
    expect(textField).toHaveValue(value);
  });

  it('Calls onChange with the new value when the text field is changed', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    const fieldset = screen.getByRole('group', { name: legend });
    const textField = within(fieldset).getByRole('textbox', { name: textMock('general.value') });
    await user.type(textField, 'abc');
    expect(onChange).toHaveBeenCalledWith({ label, value: value + 'abc' });
  });

  it('Calls onDelete when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    const fieldset = screen.getByRole('group', { name: legend });
    const deleteButton = within(fieldset).getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Closes the fieldset when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    const fieldset = screen.getByRole('group', { name: legend });
    const closeButton = within(fieldset).getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(screen.queryByRole('group', { name: legend })).not.toBeInTheDocument();
  });

  const textResourceLabels: KeyValuePairs<string> = {
    label: textMock('ux_editor.modal_properties_textResourceBindings_title'),
    description: textMock('general.description'),
    helpText: textMock('ux_editor.modal_properties_textResourceBindings_help'),
  };

  it.each(Object.keys(textResourceLabels))(
    'Displays button for %s within the fieldset',
    async (key) => {
      const user = userEvent.setup();
      renderEditOption();
      await user.click(screen.getByRole('button', { name: legend }));
      const fieldset = screen.getByRole('group', { name: legend });
      within(fieldset).getByRole('button', { name: textResourceLabels[key] });
    },
  );

  it.each(Object.keys(textResourceLabels))(
    'Opens a text resource fieldset when the %s button is clicked',
    async (key) => {
      const user = userEvent.setup();
      renderEditOption();
      await user.click(screen.getByRole('button', { name: legend }));
      const fieldset = screen.getByRole('group', { name: legend });
      const textResourceButton = within(fieldset).getByRole('button', {
        name: textResourceLabels[key],
      });
      await user.click(textResourceButton);
      screen.getByRole('group', { name: textResourceLabels[key] });
    },
  );

  it.each(Object.keys(textResourceLabels))(
    'Calls the onChange function with the updated option when the %s text resource reference is changed',
    async (key) => {
      const user = userEvent.setup();
      const testOption = { ...option, [key]: textResources[0].id };
      renderEditOption({ option: testOption });
      await user.click(screen.getByRole('button', { name: legend }));
      const fieldset = screen.getByRole('group', { name: legend });
      const textResourceButton = within(fieldset).getByRole('button', {
        name: textResourceLabels[key],
      });
      await user.click(textResourceButton);
      const textResourceFieldset = screen.getByRole('group', { name: textResourceLabels[key] });
      const searchTabLabel = textMock('ux_editor.text_resource_binding_search');
      const searchTab = within(textResourceFieldset).getByRole('tab', { name: searchTabLabel });
      await user.click(searchTab);
      const searchInput = within(textResourceFieldset).getByRole('combobox');
      await user.selectOptions(searchInput, textResources[1].id);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ ...testOption, [key]: textResources[1].id });
    },
  );

  it('Renders the label delete button as disabled', async () => {
    const user = userEvent.setup();
    renderEditOption();
    await user.click(screen.getByRole('button', { name: legend }));
    const fieldset = screen.getByRole('group', { name: legend });
    const labelButton = within(fieldset).getByRole('button', { name: textResourceLabels.label });
    await user.click(labelButton);
    const labelFieldset = screen.getByRole('group', { name: textResourceLabels.label });
    const deleteButton = within(labelFieldset).getByRole('button', {
      name: textMock('general.delete'),
    });
    expect(deleteButton).toBeDisabled();
  });

  it.each(['description', 'helpText'])(
    'Calls the onChange function with the updated option when the %s text resource is removed',
    async (key) => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const testOption = { ...option, [key]: textResources[0].id };
      renderEditOption({ option: testOption });
      await user.click(screen.getByRole('button', { name: legend }));
      const fieldset = screen.getByRole('group', { name: legend });
      const textResourceButton = within(fieldset).getByRole('button', {
        name: textResourceLabels[key],
      });
      await user.click(textResourceButton);
      const textResourceFieldset = screen.getByRole('group', { name: textResourceLabels[key] });
      const removeButtonLabel = textMock('general.delete');
      const removeButton = within(textResourceFieldset).getByRole('button', {
        name: removeButtonLabel,
      });
      await user.click(removeButton);
      expect(onChange).toHaveBeenCalledWith({ ...testOption, [key]: undefined });
    },
  );
});

const renderEditOption = (props: Partial<EditOptionProps> = {}) => {
  const queryClient = createQueryClientMock();
  const textResourceList: ITextResources = {
    [DEFAULT_LANGUAGE]: textResources,
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourceList);
  return renderWithProviders(<EditOption {...defaultProps} {...props} />, { queryClient });
};
