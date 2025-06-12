import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { ErrorSummary } from './ErrorSummary';
import type { ErrorSummaryProps } from './ErrorSummary';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('ErrorSummary', () => {
  afterEach(jest.clearAllMocks);

  it('renders the summary heading', () => {
    renderErrorSummary();
    expect(getText(textMock('app_settings.about_tab_error_summary_header'))).toBeInTheDocument();
  });

  it('renders all validation errors as links', () => {
    renderErrorSummary();

    mockErrors.forEach((error) => {
      expect(getLink(error.error)).toBeInTheDocument();
    });
  });

  it('calls onClickErrorLink with correct field when a link is clicked', async () => {
    const user = userEvent.setup();
    const onClickErrorLink = jest.fn();
    renderErrorSummary({ onClickErrorLink });

    const link: HTMLAnchorElement = getLink(mockErrors[0].error);
    await user.click(link);

    expect(onClickErrorLink).toHaveBeenCalledTimes(1);
    expect(onClickErrorLink).toHaveBeenCalledWith(mockErrors[0].field);
  });

  it('uses correct hrefs based on error index presence and type', () => {
    renderErrorSummary();

    const [repositoryName, serviceName, serviceId]: HTMLAnchorElement[] = getAllLinks();
    expect(repositoryName).toHaveAttribute('href', '#repositoryName-0');
    expect(serviceName).toHaveAttribute('href', '#serviceName-en');
    expect(serviceId).toHaveAttribute('href', '#serviceId');
  });
});

const mockErrors: AppResourceFormError[] = [
  { field: 'repositoryName', index: 0, error: 'Repository name is required' },
  { field: 'serviceName', index: 'en', error: 'Service name in English is missing' },
  { field: 'serviceId', error: 'Service ID must be unique' },
];

const defaultProps: ErrorSummaryProps = {
  validationErrors: mockErrors,
  onClickErrorLink: jest.fn(),
};

function renderErrorSummary(props: Partial<ErrorSummaryProps> = {}): RenderResult {
  return render(<ErrorSummary {...defaultProps} {...props} />);
}

const getText = (text: string): HTMLElement => screen.getByText(text);
const getLink = (text: string): HTMLAnchorElement => screen.getByRole('link', { name: text });
const getAllLinks = (): HTMLAnchorElement[] => screen.getAllByRole('link');
