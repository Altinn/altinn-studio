import { render, screen } from '@testing-library/react';
import { NoOrgSelected } from './NoOrgSelected';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('NoOrgSelected', () => {
  it('renders the no-org-selected alert message', () => {
    render(<NoOrgSelected />);
    expect(screen.getByText(textMock('admin.apps.alert_no_org_selected'))).toBeInTheDocument();
  });

  it('renders the no-access message', () => {
    render(<NoOrgSelected />);
    expect(
      screen.getByText(textMock('admin.apps.alert_no_org_selected_no_access')),
    ).toBeInTheDocument();
  });
});
