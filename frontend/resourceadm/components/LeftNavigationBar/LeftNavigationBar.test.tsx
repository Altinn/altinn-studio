import React from 'react';
import { render } from '@testing-library/react';
import { LeftNavigationBar, LeftNavigationBarProps } from './LeftNavigationBar';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

describe('LeftNavigationBar', () => {

  const mockNavigateToPage = jest.fn();
  const mockGoBack = jest.fn();

  const defaultProps: LeftNavigationBarProps = {

    currentPage: 'about',
    navigateToPage: mockNavigateToPage,
    goBack: mockGoBack,
  };

  it('renders without crashing', () => {
    render(<LeftNavigationBar {...defaultProps} />);
  });

  it('navigates to the selected page', async () => {
    const user = userEvent.setup();
    render(<LeftNavigationBar {...defaultProps} />);

    const policyButton = screen.getByRole('button', { name: textMock('resourceadm.left_nav_bar_policy') })
    await act(() =>  user.click(policyButton))

    expect(mockNavigateToPage).toHaveBeenCalledWith('policy');
  });

  it('calls goBack function when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<LeftNavigationBar {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: textMock('resourceadm.left_nav_bar_back') })
    await act(() =>  user.click(backButton))

    expect(mockGoBack).toHaveBeenCalled();
  });
});
