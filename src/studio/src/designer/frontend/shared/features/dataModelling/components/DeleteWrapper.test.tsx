import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { IDeleteWrapper } from './DeleteWrapper';
import { DeleteWrapper } from './DeleteWrapper';

const user = userEvent.setup();

describe('DeleteWrapper', () => {
  it('should not be able to open the delete dialog if no schemaName is set', async () => {
    const userWithNoPointerEventCheck = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    render({ schemaName: undefined });

    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();

    const deleteButton = screen.getByRole('button', {
      name: /general\.delete/i,
    });
    await userWithNoPointerEventCheck.click(deleteButton);

    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should open the delete dialog when clicking delete button and schemaName is set', async () => {
    render({ schemaName: 'some-name' });

    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();
    const deleteButton = screen.getByRole('button', {
      name: /general\.delete/i,
    });
    await user.click(deleteButton);

    expect(
      screen.getByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).toBeInTheDocument();
  });

  it('should call deleteAction callback and close dialog when clicking continue button', async () => {
    const handleDelete = jest.fn();
    render({
      schemaName: 'some-name',
      deleteAction: handleDelete,
    });

    const deleteButton = screen.getByRole('button', {
      name: /general\.delete/i,
    });
    await user.click(deleteButton);

    const continueButton = screen.getByRole('button', {
      name: /general\.continue/i,
    });
    await user.click(continueButton);

    expect(handleDelete).toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should close the delete dialog when clicking cancel', async () => {
    render({ schemaName: 'some-name' });

    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();
    const deleteButton = screen.getByRole('button', {
      name: /general\.delete/i,
    });
    await user.click(deleteButton);

    expect(
      screen.getByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', {
      name: /general\.cancel/i,
    });
    await user.click(cancelButton);

    expect(
      screen.queryByRole('heading', {
        name: /delete some-name\?/i,
      }),
    ).not.toBeInTheDocument();
  });
});

const render = (props: Partial<IDeleteWrapper> = {}) => {
  const allProps = {
    language: { administration: { delete_model_confirm: 'Delete {0}?' } },
    deleteAction: jest.fn(),
    schemaName: 'deletable-model',
    ...props,
  } as IDeleteWrapper;

  return rtlRender(<DeleteWrapper {...allProps} />);
};
