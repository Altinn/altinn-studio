import { CriticalFileAlert, type CriticalFileAlertProps } from './CriticalFileAlert';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { criticalFileAlertTexts } from '../../../../../mocks/mockTexts';

const criticalFilePath1 = 'App/config/authorization/policy.xml';
const criticalFilePath2 = 'App/config/applicationmetadata.json';

describe('CriticalFileAlert', () => {
  it('renders the heading and description', () => {
    renderCriticalFileAlert();

    expect(
      screen.getByRole('heading', { name: criticalFileAlertTexts.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(criticalFileAlertTexts.description)).toBeInTheDocument();
  });

  it('renders each critical file path', () => {
    renderCriticalFileAlert();

    expect(screen.getByText(criticalFilePath1)).toBeInTheDocument();
    expect(screen.getByText(criticalFilePath2)).toBeInTheDocument();
  });
});

const defaultProps: CriticalFileAlertProps = {
  criticalFiles: [criticalFilePath1, criticalFilePath2],
  texts: criticalFileAlertTexts,
};

const renderCriticalFileAlert = (props: Partial<CriticalFileAlertProps> = {}): RenderResult =>
  render(<CriticalFileAlert {...defaultProps} {...props} />);
