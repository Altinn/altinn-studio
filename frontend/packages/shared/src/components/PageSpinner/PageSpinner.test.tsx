import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { PageSpinnerProps } from './PageSpinner';
import { PageSpinner } from './PageSpinner';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('PageSpinner', () => {
  it('should render spinner without text', () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render spinner with text', () => {
    const spinnerText = 'test';
    render({ spinnerText });
    expect(screen.getByText(spinnerText)).toBeInTheDocument();
    expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument();
  });
});

const render = (props? : PageSpinnerProps) => {
  return rtlRender(
    <PageSpinner {...props} />
  );
};
