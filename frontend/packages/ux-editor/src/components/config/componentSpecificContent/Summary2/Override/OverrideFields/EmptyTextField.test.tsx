import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { EmptyTextField } from './EmptyTextField';
import { component1IdMock } from '../../../../../../testing/layoutMock';
import { userEvent } from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';

describe('EmptyTextField', () => {
  it('Should display textfield when openbutton is clicked', async () => {
    const user = userEvent.setup();
    render();
    await user.click(emptyTextFieldButton());
    expect(emptyTextFieldTextBox()).toBeInTheDocument();
  });

  it('should call onChange prop when textbox is edited', async () => {
    const user = userEvent.setup();
    render();
    await user.click(emptyTextFieldButton());
    const inputtext = 'test string 123@';
    await user.type(emptyTextFieldTextBox(), inputtext);
    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({ emptyFieldText: inputtext }),
    );
  });

  it('should close editor on input blur', async () => {
    const user = userEvent.setup();
    render();
    await user.click(emptyTextFieldButton());
    await user.type(emptyTextFieldTextBox(), 'inputtext');
    expect(emptyTextFieldTextBox()).toBeInTheDocument();
    await user.click(document.body);
    expect(emptyTextFieldTextBox()).not.toBeInTheDocument();
  });

  it('should close editor when pressing enter', async () => {
    const user = userEvent.setup();
    render();
    await user.click(emptyTextFieldButton());
    await user.type(emptyTextFieldTextBox(), 'inputtext');
    expect(emptyTextFieldTextBox()).toBeInTheDocument();
    await user.type(emptyTextFieldTextBox(), '{enter}');
    expect(emptyTextFieldTextBox()).not.toBeInTheDocument();
  });
});

const emptyTextFieldButton = () =>
  screen.getByRole('button', {
    name: /ux_editor.component_properties.summary.override.empty_field_text/i,
  });
const emptyTextFieldTextBox = () =>
  screen.queryByRole('textbox', {
    name: /ux_editor.component_properties.summary.override.empty_field_text/i,
  });

const onChangeMock = jest.fn();

const render = () => {
  const override: Summary2OverrideConfig = {
    componentId: component1IdMock,
    hidden: false,
  };
  return renderWithProviders(<EmptyTextField onChange={onChangeMock} override={override} />);
};
