import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfigDetailsRow, type ConfigDetailsRowProps } from './ConfigDetailsRow';

const mockTitle: string = 'Title';
const mockText: string = 'Text';

const defaultProps: ConfigDetailsRowProps = {
  title: mockTitle,
  text: mockText,
};

describe('ConfigDetailsRow', () => {
  afterEach(jest.clearAllMocks);

  it('displays the title and text correctly on screen', () => {
    render(<ConfigDetailsRow {...defaultProps} />);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockText)).toBeInTheDocument();
  });
});
