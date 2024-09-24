import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import { CreateSubFormWrapper } from './CreateSubFormWrapper';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { layoutSetsMock, layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const subFormName = 'underskjema';

describe('CreateSubFormWrapper', () => {
  it('renders component', async () => {
    const user = userEvent.setup();
    renderCreateSubFormWrapper();

    const createSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    await user.click(createSubFormButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should call onSubFormCreated when subform is created', async () => {
    const user = userEvent.setup();
    const onSubFormCreated = jest.fn();
    renderCreateSubFormWrapper(onSubFormCreated);

    const createSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    await user.click(createSubFormButton);

    const input = screen.getByRole('textbox');
    await user.type(input, subFormName);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form.confirm_button'),
    });
    await user.click(confirmButton);
    expect(onSubFormCreated).toHaveBeenCalledWith(subFormName);
  });

  it('should disable confirm button when name already exist', async () => {
    const user = userEvent.setup();
    renderCreateSubFormWrapper();

    const createSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    await user.click(createSubFormButton);

    const input = screen.getByRole('textbox');
    await user.type(input, layoutSet1NameMock);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form.confirm_button'),
    });
    expect(confirmButton).toBeDisabled();
  });

  it('should add subform when name is valid', async () => {
    const onSubFormCreatedMock = jest.fn();
    const user = userEvent.setup();
    const addLayoutSet = jest.fn().mockImplementation();

    renderCreateSubFormWrapper(onSubFormCreatedMock, { addLayoutSet });

    const createSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    await user.click(createSubFormButton);

    const input = screen.getByRole('textbox');
    await user.type(input, subFormName);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form.confirm_button'),
    });
    await user.click(confirmButton);
    expect(addLayoutSet).toHaveBeenCalledWith(org, app, subFormName, {
      layoutSetConfig: { id: subFormName, type: 'subform' },
    });
  });
});

const renderCreateSubFormWrapper = (
  onSubFormCreated?: jest.Mock,
  queries: Partial<ServicesContextProps> = {},
) => {
  return renderWithProviders(
    <CreateSubFormWrapper layoutSets={layoutSetsMock} onSubFormCreated={onSubFormCreated} />,
    { queries },
  );
};
