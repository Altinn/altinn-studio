import React from 'react';
import { screen } from '@testing-library/react';
import { FormDesignerNavigation } from './FormDesignerNavigation';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('FormDesignerNavigation', () => {
  it('renders the contact link', () => {
    render();
    expect(screen.getByRole('link', { name: textMock('general.contact') })).toBeInTheDocument();
  });
});

const render = () => renderWithProviders()(<FormDesignerNavigation />);
