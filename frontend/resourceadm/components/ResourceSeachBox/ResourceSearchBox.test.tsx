import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchBoxProps } from './ResourceSeachBox';
import { SearchBox } from './ResourceSeachBox';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';

describe('SearchBox', () => {
  const mockOnChange = jest.fn();

  const defaultProps: SearchBoxProps = {
    onChange: mockOnChange,
  };

  it('calls onChange function when value is typed', async () => {
    const user = userEvent.setup();
    render(<SearchBox {...defaultProps} />);

    const searchInput = screen.getByLabelText(textMock('resourceadm.dashboard_searchbox'));
    await act(() => user.type(searchInput, 'example text'));

    expect(mockOnChange).toHaveBeenCalledWith('example text');
  });
});
