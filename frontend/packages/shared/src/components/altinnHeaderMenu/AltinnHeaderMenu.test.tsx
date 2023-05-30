import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeaderMenu, AltinnHeaderMenuItem, IAltinnHeaderMenuProps } from './AltinnHeaderMenu';
import { MemoryRouter } from 'react-router-dom';

describe('AltinnHeaderMenu', () => {
  const mockMenu: AltinnHeaderMenuItem[] = [
    {
      key: 'key1',
      link: <a href='link1'>Link1</a>,
    },
    {
      key: 'key2',
      link: <a href='link1'>Link2</a>,
    },
    {
      key: 'key3',
      link: <a href='link1'>Link3</a>,
    },
  ];
  it('Should render nothing if there are no provided meny items', () => {
    render();
    expect(screen.queryByTestId('altinn-header-menu')).not.toBeInTheDocument();
  });

  it('should render all provided menu items', () => {
    render({ menu: mockMenu });
    expect(screen.queryAllByRole('link')).toHaveLength(3);
  });
});

const render = (props: Partial<IAltinnHeaderMenuProps> = {}) => {
  const defaultProps: IAltinnHeaderMenuProps = {
    activeSubHeaderSelection: 'create',
    menu: [],
  };

  return rtlRender(
    <MemoryRouter>
      <AltinnHeaderMenu {...defaultProps} {...props} />
    </MemoryRouter>
  );
};
