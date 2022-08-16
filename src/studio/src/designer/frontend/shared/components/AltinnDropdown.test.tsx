import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AltinnDropdown } from './AltinnDropdown';
import type { IAltinnDropdownComponentProvidedProps } from './AltinnDropdown';

const user = userEvent.setup();

describe('AltinnDropdown', () => {
  it('should not show dropdownItems until button is clicked', async () => {
    render({ dropdownItems: ['item1', 'item2'] });

    expect(screen.queryByText('item1')).not.toBeInTheDocument();
    expect(screen.queryByText('item2')).not.toBeInTheDocument();

    const input = screen.getByRole('button');
    await user.click(input);

    expect(screen.getByText('item1')).toBeInTheDocument();
    expect(screen.getByText('item2')).toBeInTheDocument();
  });

  it('should accept array of strings as dropdownItems, and use the string as both label and value', async () => {
    render({ dropdownItems: ['item1', 'item2'] });

    const input = screen.getByRole('button');
    await user.click(input);

    const item1 = screen.getByRole('option', {
      name: /item1/i,
    });
    const item2 = screen.getByRole('option', {
      name: /item2/i,
    });

    expect(item1).toBeInTheDocument();
    expect(item2).toBeInTheDocument();
    expect(item1.getAttribute('data-value')).toEqual('item1');
    expect(item2.getAttribute('data-value')).toEqual('item2');
  });

  it('should accept array of label/value pairs as dropdownItems, and use label property as label, and value property as value', async () => {
    render({
      dropdownItems: [
        {
          value: 'val1',
          label: 'item1',
        },
        {
          value: 'val2',
          label: 'item2',
        },
      ],
    });

    const input = screen.getByRole('button');
    await user.click(input);

    const item1 = screen.getByRole('option', {
      name: /item1/i,
    });
    const item2 = screen.getByRole('option', {
      name: /item2/i,
    });

    expect(item1).toBeInTheDocument();
    expect(item2).toBeInTheDocument();
    expect(item1.getAttribute('data-value')).toEqual('val1');
    expect(item2.getAttribute('data-value')).toEqual('val2');
  });
});

const render = (props: Partial<IAltinnDropdownComponentProvidedProps> = {}) => {
  const allProps = {
    selectedValue: '',
    ...props,
  } as IAltinnDropdownComponentProvidedProps;

  rtlRender(<AltinnDropdown {...allProps} />);
};
