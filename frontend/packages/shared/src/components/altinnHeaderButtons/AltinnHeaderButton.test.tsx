import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { AltinnHeaderButtonProps } from './AltinnHeaderButton';
import { AltinnHeaderButton } from './AltinnHeaderButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AltinnButtonActionItem } from '../altinnHeader/types';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';

const mockTo: string = '/test';
const mockMenuKey: TopBarMenu = TopBarMenu.About;
const mockAction: AltinnButtonActionItem = {
  menuKey: mockMenuKey,
  to: mockTo,
};

describe('AltinnHeaderbuttons', () => {
  afterEach(jest.clearAllMocks);

  it('should render nothing if action is undefined', () => {
    render({ action: undefined });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render the button for the provided action with the correct href', () => {
    render();

    const link = screen.getByRole('link', { name: textMock(mockMenuKey) });
    expect(link).toHaveAttribute('href', mockTo);
  });
});

const render = (props?: Partial<AltinnHeaderButtonProps>) => {
  const defaultProps: AltinnHeaderButtonProps = {
    action: mockAction,
  };
  rtlRender(<AltinnHeaderButton {...defaultProps} {...props} />, { wrapper: undefined });
};
