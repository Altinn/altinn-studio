import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AltinnMobileTableItem } from 'src/features/form/containers/AltinnMobileTableItem';
import { renderWithProviders } from 'src/testUtils';
import type { IAltinnMobileTableItemProps, IMobileTableItem } from 'src/features/form/containers/AltinnMobileTableItem';
import type { ILanguage } from 'src/types/shared';

const user = userEvent.setup();

describe('AltinnMobileTableItem', () => {
  it('renders delete icon-button when deleteFunctionality is given as property', () => {
    render({
      deleteFunctionality: {
        onDeleteClick: jest.fn(),
        deleteButtonText: 'Delete',
        popoverOpen: false,
        popoverPanelIndex: -1,
        onPopoverDeleteClick: () => jest.fn(),
        onOpenChange: jest.fn(),
        setPopoverOpen: jest.fn(),
      },
    });

    expect(
      screen.getByRole('button', {
        name: /delete-value1/i,
      }),
    ).toBeInTheDocument();
  });

  it('does not render delete icon-button when deleteIconNode is not given as property', () => {
    render();

    expect(
      screen.queryByRole('button', {
        name: /delete-value1/i,
      }),
    ).not.toBeInTheDocument();
  });
  it('triggers onEditClick when editbutton is present and clicked', async () => {
    const onEditClick = jest.fn();
    render({
      onEditClick,
    });

    await user.click(
      screen.getByRole('button', {
        name: /edit-value1/i,
      }),
    );

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('triggers onDeleteClick when delete-button is present and clicked', async () => {
    const onDeleteClick = jest.fn();
    render({
      deleteFunctionality: {
        onDeleteClick,
        deleteButtonText: 'Delete',
        popoverOpen: false,
        popoverPanelIndex: -1,
        onPopoverDeleteClick: () => jest.fn(),
        onOpenChange: jest.fn(),
        setPopoverOpen: jest.fn(),
      },
    });

    await user.click(
      screen.getByRole('button', {
        name: /delete-value1/i,
      }),
    );

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });
});

const render = (props: Partial<IAltinnMobileTableItemProps> = {}) => {
  const items = [
    { key: 'test1', label: 'label1', value: 'value1' },
    { key: 'test2', label: 'label2', value: 'value2' },
  ] as IMobileTableItem[];

  const language: ILanguage = {
    general: {
      delete: 'Delete',
      edit_alt: 'Edit',
    },
  };

  const allProps = {
    items,
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    editIconNode: ' i ',
    editButtonText: 'Edit',
    language,
    ...props,
  } as IAltinnMobileTableItemProps;

  return renderWithProviders(<AltinnMobileTableItem {...allProps} />);
};
