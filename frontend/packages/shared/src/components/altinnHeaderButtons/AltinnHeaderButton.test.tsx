import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { AltinnHeaderButtonProps } from './AltinnHeaderButton';
import { AltinnHeaderButton } from './AltinnHeaderButton';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { AltinnButtonActionItem } from '../altinnHeader/types';

const mockTo: string = '/test';
const mockButtonTitle: string = 'title';
const mockAction: AltinnButtonActionItem = {
  menuKey: 'menu-1',
  title: mockButtonTitle,
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

    const link = screen.getByRole('link', { name: textMock(mockButtonTitle) });
    expect(link).toHaveAttribute('href', mockTo);
  });
});

const render = (props?: Partial<AltinnHeaderButtonProps>) => {
  const defaultProps: AltinnHeaderButtonProps = {
    action: mockAction,
  };
  rtlRender(<AltinnHeaderButton {...defaultProps} {...props} />, { wrapper: undefined });
};
