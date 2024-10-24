import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import { CreateSubformWrapper } from './CreateSubFormWrapper';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { layoutSetsMock, layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const subformName = 'underskjema';

describe('CreateSubformWrapper', () => {
  it('should open dialog when clicking "create subform" button', async () => {
    const user = userEvent.setup();
    renderCreateSubformWrapper();

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    await user.click(createSubformButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should call onSubformCreated when subform is created', async () => {
    const user = userEvent.setup();
    const onSubformCreated = jest.fn();
    renderCreateSubformWrapper(onSubformCreated);

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    await user.click(createSubformButton);

    const input = screen.getByRole('textbox');
    await user.type(input, subformName);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform.confirm_button'),
    });
    await user.click(confirmButton);
    expect(onSubformCreated).toHaveBeenCalledWith(subformName);
  });

  it('should disable confirm button when name already exist', async () => {
    const user = userEvent.setup();
    renderCreateSubformWrapper();

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    await user.click(createSubformButton);

    const input = screen.getByRole('textbox');
    await user.type(input, layoutSet1NameMock);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform.confirm_button'),
    });
    expect(confirmButton).toBeDisabled();
  });

  it('should add subform when name is valid', async () => {
    const onSubformCreatedMock = jest.fn();
    const user = userEvent.setup();
    const addLayoutSet = jest.fn();

    renderCreateSubformWrapper(onSubformCreatedMock, { addLayoutSet });

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    await user.click(createSubformButton);

    const input = screen.getByRole('textbox');
    await user.type(input, subformName);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform.confirm_button'),
    });
    await user.click(confirmButton);
    expect(addLayoutSet).toHaveBeenCalledWith(org, app, subformName, {
      layoutSetConfig: { id: subformName, type: 'subform' },
    });
  });
});

const renderCreateSubformWrapper = (
  onSubformCreated?: jest.Mock,
  queries: Partial<ServicesContextProps> = {},
) => {
  return renderWithProviders(
    <CreateSubformWrapper layoutSets={layoutSetsMock} onSubformCreated={onSubformCreated} />,
    { queries },
  );
};
