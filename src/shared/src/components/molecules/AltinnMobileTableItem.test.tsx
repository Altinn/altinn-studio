import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import type { IAltinnMobileTableItemProps, IMobileTableItem } from './AltinnMobileTableItem';
import AltinnMobileTableItem from './AltinnMobileTableItem';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('AltinnMobileTableItem', () => {
  it('renders delete icon-button when deleteIconNode is given as property', () => {
    render({
      deleteFunctionality: {
        onDeleteClick: jest.fn(),
        deleteButtonText: 'Delete',
        deleteIconNode: <i></i>,
        popoverOpen: false,
        popoverPanelIndex: -1,
        onPopoverDeleteClick: () => jest.fn(),
        language: {},
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
      onEditClick: onEditClick,
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
        onDeleteClick: onDeleteClick,
        deleteButtonText: 'Delete',
        deleteIconNode: <i></i>,
        popoverOpen: false,
        popoverPanelIndex: -1,
        onPopoverDeleteClick: () => jest.fn(),
        language: {},
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

  const allProps = {
    items: items,
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    editIconNode: ' i ',
    editButtonText: 'Edit',
    ...props,
  } as IAltinnMobileTableItemProps;

  return renderRtl(<AltinnMobileTableItem {...allProps} />);
};
