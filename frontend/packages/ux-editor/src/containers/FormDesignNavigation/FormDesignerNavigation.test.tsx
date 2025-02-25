import React from 'react';
import { screen } from '@testing-library/react';
import { FormDesignerNavigation, type FormDesignerNavigationProps } from './FormDesignerNavigation';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultProps = {
  appConfig: 'test',
};

describe('FormDesignerNavigation', () => {
  it('renders the component with heading text test', () => {
    render({ appConfig: 'test' });
    expect(screen.getByText('test')).toBeInTheDocument();
  });
  it('renders the contact link', () => {
    render();
    expect(screen.getByRole('link', { name: textMock('general.contact') })).toBeInTheDocument();
  });
});

const render = (props: Partial<FormDesignerNavigationProps> = {}) =>
  renderWithProviders()(<FormDesignerNavigation {...defaultProps} {...props} />);
