import { render, screen } from '@testing-library/react';
import {
  ErrorBoundary,
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { textMock } from '@studio/testing/mocks/i18nMock';

function expectDefaultErrorUI(): void {
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: textMock('general.page_error_title'),
    }),
  ).toBeInTheDocument();
  expect(screen.getByText(textMock('general.page_error_message'))).toBeInTheDocument();
}

describe('PageRouterErrorBoundary', () => {
  it('renders the generic page error from ErrorBoundary', () => {
    render(<ErrorBoundary />);
    expectDefaultErrorUI();
  });

  it('renders the same generic page error from all boundary aliases', () => {
    const { rerender } = render(<AppRouteErrorBoundary />);
    expectDefaultErrorUI();

    rerender(<NotFoundRouteErrorBoundary />);
    expectDefaultErrorUI();

    rerender(<RouteErrorBoundary />);
    expectDefaultErrorUI();
  });
});
