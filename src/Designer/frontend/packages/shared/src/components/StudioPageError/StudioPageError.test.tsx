import { render, screen } from '@testing-library/react';
import { StudioPageError } from './StudioPageError';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('StudioPageError', () => {
  it('renders title and support link', () => {
    render(<StudioPageError />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: textMock('general.page_error_title'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(textMock('general.page_error_message'))).toBeInTheDocument();
  });
});
