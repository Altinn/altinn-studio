import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAltinnHeaderMenuProps } from './AltinnHeaderMenu';
import { AltinnHeaderMenu } from './AltinnHeaderMenu';
import { MemoryRouter } from 'react-router-dom';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from 'app-shared/types/global';
import { textMock } from '../../../../../testing/mocks/i18nMock';

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

const mockMenuItem4: TopBarMenuItem = {
  key: TopBarMenu.ProcessEditor,
  link: 'Link4',
  repositoryTypes: [RepositoryType.App],
  isBeta: true,
};

describe('AltinnHeaderMenu', () => {
  afterEach(jest.clearAllMocks);

  it('Should render nothing if there are no provided meny items', () => {
    render();
    expect(screen.queryByTestId('altinn-header-menu')).not.toBeInTheDocument();
  });

  it('should render all provided menu items', () => {
    render({ menuItems: mockMenuItems });
    expect(screen.queryAllByRole('link')).toHaveLength(3);
  });

  it('shouldm not render the beta tag when there is no beta', () => {
    render({ menuItems: mockMenuItems });

    expect(screen.queryByText(textMock('general.beta'))).not.toBeInTheDocument();
  });

  it('should render the beta tag when an item is beta', () => {
    render({ menuItems: [...mockMenuItems, mockMenuItem4] });

    expect(screen.getByText(textMock('general.beta'))).toBeInTheDocument();
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
