import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeaderMenu, IAltinnHeaderMenuProps } from './AltinnHeaderMenu';
import { MemoryRouter } from 'react-router-dom';
import { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from 'app-shared/types/global';

describe('AltinnHeaderMenu', () => {
  const mockMenuItems: TopBarMenuItem[] = [
    {
      key: TopBarMenu.About,
      link: 'Link1',
      repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
    },
    {
      key: TopBarMenu.Create,
      link: 'Link2',
      repositoryTypes: [RepositoryType.App],
    },
    {
      key: TopBarMenu.Datamodel,
      link: 'Link3',
      repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
    },
  ];
  it('Should render nothing if there are no provided meny items', () => {
    render();
    expect(screen.queryByTestId('altinn-header-menu')).not.toBeInTheDocument();
  });

  it('should render all provided menu items', () => {
    render({ menuItems: mockMenuItems });
    expect(screen.queryAllByRole('link')).toHaveLength(3);
  });
});

const render = (props: Partial<IAltinnHeaderMenuProps> = {}) => {
  const defaultProps: IAltinnHeaderMenuProps = {
    menuItems: [],
  };

  return rtlRender(
    <MemoryRouter>
      <AltinnHeaderMenu {...defaultProps} {...props} />
    </MemoryRouter>,
  );
};
