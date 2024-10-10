import React from 'react';
import { render, screen } from '@testing-library/react';
import { UndefinedLayoutSet, type UndefinedLayoutSetProps } from './UndefinedLayoutSet';
import userEvent from '@testing-library/user-event';

const defaultUndefinedLayoutSetProps = {
  onClick: jest.fn(),
  label: '',
};

describe('UndefinedLayoutSet', () => {
  it('it should render add layout-set with given label', () => {
    const label = 'Add link to layout set';
    renderUndefinedLayoutSet({
      ...defaultUndefinedLayoutSetProps,
      label,
    });

    const addLinkToLayoutSetButton = screen.getByRole('button', { name: label });
    expect(addLinkToLayoutSetButton).toBeInTheDocument();
  });

  it('should invoke onClick callback when button is clicked', async () => {
    const user = userEvent.setup();
    const label = 'add';
    const onClickMock = jest.fn();

    renderUndefinedLayoutSet({
      onClick: onClickMock,
      label,
    });

    const button = screen.getByRole('button', { name: label });
    await user.click(button);

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});

const renderUndefinedLayoutSet = (props?: UndefinedLayoutSetProps): void => {
  render(<UndefinedLayoutSet {...(props || defaultUndefinedLayoutSetProps)} />);
};
