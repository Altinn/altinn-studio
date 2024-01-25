import React from 'react';
import { render, screen } from '@testing-library/react';
import type { GoBackButtonProps } from './GoBackButton';
import { GoBackButton } from './GoBackButton';
import { MemoryRouter } from 'react-router-dom';

const mockBackButtonText: string = 'Go back';

describe('GoBackButton', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: GoBackButtonProps = {
    className: '.navigationElement',
    to: '/back',
    text: mockBackButtonText,
  };

  it('calls the "onClickBackButton" function when the button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GoBackButton {...defaultProps} />
      </MemoryRouter>,
    );

    const backButton = screen.getByRole('link', { name: mockBackButtonText });
    expect(backButton).toBeInTheDocument();
  });
});
