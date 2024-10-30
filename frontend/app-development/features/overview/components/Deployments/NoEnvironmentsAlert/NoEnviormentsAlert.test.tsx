import React from 'react';
import { render, screen } from '@testing-library/react';
import { NoEnvironmentsAlert } from './NoEnvironmentsAlert';
import { textMock } from '@studio/testing/mocks/i18nMock';

it('should render no environments information', () => {
  render(<NoEnvironmentsAlert />);
  expect(
    screen.getByRole('heading', { name: textMock('app_deployment.no_env_title'), level: 2 }),
  ).toBeInTheDocument();

  expect(screen.getByText(textMock('app_deployment.no_env_1')));
  expect(screen.getByText(textMock('app_deployment.no_env_2')));
});
