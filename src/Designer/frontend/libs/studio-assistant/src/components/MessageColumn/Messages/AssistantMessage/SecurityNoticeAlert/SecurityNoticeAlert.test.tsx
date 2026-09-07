import { SecurityNoticeAlert, type SecurityNoticeAlertProps } from './SecurityNoticeAlert';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { securityNoticeAlertTexts } from '../../../../../mocks/mockTexts';

describe('SecurityNoticeAlert', () => {
  it('renders the heading and description', () => {
    renderSecurityNoticeAlert();

    expect(
      screen.getByRole('heading', { name: securityNoticeAlertTexts.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(securityNoticeAlertTexts.description)).toBeInTheDocument();
  });
});

const defaultProps: SecurityNoticeAlertProps = {
  texts: securityNoticeAlertTexts,
};

const renderSecurityNoticeAlert = (props: Partial<SecurityNoticeAlertProps> = {}): RenderResult =>
  render(<SecurityNoticeAlert {...defaultProps} {...props} />);
