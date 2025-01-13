import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchBoxProps } from './ResourceSearchBox';
import { SearchBox } from './ResourceSearchBox';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('SearchBox', () => {
  const mockOnChange = jest.fn();

  const defaultProps: SearchBoxProps = {
    onChange: mockOnChange,
  };

  it('calls onChange function when value is typed', async () => {
    const user = userEvent.setup();
    render(<SearchBox {...defaultProps} />);

    const searchInput = screen.getByLabelText(textMock('resourceadm.dashboard_searchbox'));
    await user.type(searchInput, 'example text');

    expect(mockOnChange).toHaveBeenCalledWith('example text');
  });
});
