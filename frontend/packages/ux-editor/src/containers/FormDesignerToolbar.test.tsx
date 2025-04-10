import React from 'react';
import { screen } from '@testing-library/react';
import { FormDesignerToolbar } from './FormDesignerToolbar';
import { renderWithProviders } from '../testing/mocks';

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  ...jest.requireActual('app-shared/utils/featureToggleUtils'),
  shouldDisplayFeature: jest.fn(),
}));

jest.mock('./BreadcrumbsTaskNavigation', () => ({
  BreadcrumbsTaskNavigation: () => <div data-testid='breadcrumbsTaskNavigation' />,
}));

describe('FormDesignerToolbar', () => {
  it('renders BreadcrumbsTaskNavigation component', () => {
    renderFormDesignerToolbar();
    expect(screen.getByTestId('breadcrumbsTaskNavigation')).toBeInTheDocument();
  });
});

const renderFormDesignerToolbar = () => {
  return renderWithProviders(<FormDesignerToolbar />);
};
