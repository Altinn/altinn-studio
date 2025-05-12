import React from 'react';
import { screen } from '@testing-library/react';
import { FormDesignerNavigation } from './Home';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('app-development/hooks/queries', () => ({
  useAppConfigQuery: jest.fn(() => ({ data: { serviceName: 'test' } })),
}));

describe('FormDesignerNavigation', () => {
  it('renders the component with heading text test', () => {
    render();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders the contact link', () => {
    render();
    expect(screen.getByRole('link', { name: textMock('general.contact') })).toBeInTheDocument();
  });
});

const render = () => renderWithProviders()(<FormDesignerNavigation />);
