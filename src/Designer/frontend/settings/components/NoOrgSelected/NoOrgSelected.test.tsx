import { render, screen } from '@testing-library/react';
import { NoOrgSelected } from './NoOrgSelected';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('NoOrgSelected', () => {
  it('renders the coming-soon message', () => {
    render(<NoOrgSelected />);
    expect(screen.getByText(textMock('settings.user.coming_soon'))).toBeInTheDocument();
  });

  it('renders the select-org guidance message', () => {
    render(<NoOrgSelected />);
    expect(screen.getByText(textMock('settings.user.coming_soon_use_org'))).toBeInTheDocument();
  });
});
