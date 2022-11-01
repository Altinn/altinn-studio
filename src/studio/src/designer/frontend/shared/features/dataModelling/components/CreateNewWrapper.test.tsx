import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { ICreateNewWrapper } from './CreateNewWrapper';
import { CreateNewWrapper } from './CreateNewWrapper';

const user = userEvent.setup();

describe('CreateNewWrapper', () => {
  it('should open the popup when clicking "new" button', async () => {
    render();

    const newButton = screen.getByRole('button', {
      name: /general\.create_new/i,
    });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(newButton);

    expect(
      screen.queryByRole('button', {
        name: /general\.create_new/i,
      }),
    ).not.toBeInTheDocument();

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      }),
    ).toBeInTheDocument();
  });

  describe('createAction', () => {
    it('should call createAction callback when ok button is clicked', async () => {
      const handleChange = jest.fn();
      render({ createAction: handleChange });

      const newButton = screen.getByRole('button', {
        name: /general\.create_new/i,
      });
      await user.click(newButton);

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      });
      await user.type(textInput, 'new-model');
      await user.click(okButton);
      expect(handleChange).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: undefined,
      });
    });

    it('should call createAction callback when input is focused and Enter key is pressed', async () => {
      const handleChange = jest.fn();
      render({ createAction: handleChange });

      const newButton = screen.getByRole('button', {
        name: /general\.create_new/i,
      });
      await user.click(newButton);

      const textInput = screen.getByRole('textbox');

      await user.type(textInput, 'new-model');
      await user.keyboard('{Enter}');
      expect(handleChange).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: undefined,
      });
    });

    it('should call createAction callback with relativePath when createPathOption is set and ok button is clicked', async () => {
      const handleChange = jest.fn();
      render({ createAction: handleChange, createPathOption: true });

      const newButton = screen.getByRole('button', {
        name: /general\.create_new/i,
      });
      await user.click(newButton);

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      });
      await user.type(textInput, 'new-model');
      await user.click(okButton);
      expect(handleChange).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: '',
      });
    });

    it('should not call createAction callback and show error message when trying to create a new model with the same name as an existing one when ok button is clicked', async () => {
      const handleChange = jest.fn();
      const modelName = 'existing-model-name';
      const errMessage = /a model with name existing-model-name already exists\./i;
      render({ createAction: handleChange, dataModelNames: [modelName] });

      const newButton = screen.getByRole('button', {
        name: /general\.create_new/i,
      });
      await user.click(newButton);

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      });

      await user.type(textInput, modelName);
      expect(screen.queryByText(errMessage)).not.toBeInTheDocument();

      await user.click(okButton);

      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByText(errMessage)).toBeInTheDocument();
    });

    it('should not call createAction callback when trying to create a new model with no name when ok button is clicked', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      const handleChange = jest.fn();
      const modelName = '';
      render({ createAction: handleChange, dataModelNames: [modelName] });

      const newButton = screen.getByRole('button', {
        name: /general\.create_new/i,
      });
      await userWithNoPointerEventCheck.click(newButton);

      const okButton = screen.getByRole('button', {
        name: /schema_editor\.create_model_confirm_button/i,
      });

      await userWithNoPointerEventCheck.click(okButton);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});

const render = (props: Partial<ICreateNewWrapper> = {}) => {
  const allProps = {
    language: { administration: {} },
    dataModelNames: [],
    createAction: jest.fn(),
    ...props,
  } as ICreateNewWrapper;

  return rtlRender(<CreateNewWrapper {...allProps} />);
};
