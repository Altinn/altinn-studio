import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { HeaderMenuProps } from './HeaderMenu';
import { HeaderMenu } from './HeaderMenu';
import { MemoryRouter } from 'react-router-dom';
import type { HeaderMenuItem } from 'app-shared/types/TopBarMenuItem';
import { HeaderMenuKey } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from 'app-shared/types/global';
import { textMock } from '@studio/testing/mocks/i18nMock';

// TODO OLD CODE
const mockMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuKey.About,
    link: 'Link1',
    repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
  },
  {
    key: HeaderMenuKey.Create,
    link: 'Link2',
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: HeaderMenuKey.DataModel,
    link: 'Link3',
    repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
  },
];

const mockMenuItem4: HeaderMenuItem = {
  key: HeaderMenuKey.ProcessEditor,
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

const render = (props: Partial<HeaderMenuProps> = {}) => {
  const defaultProps: HeaderMenuProps = {
    menuItems: [],
  };

  return rtlRender(
    <MemoryRouter>
      <HeaderMenu {...defaultProps} {...props} />
    </MemoryRouter>,
  );
};
