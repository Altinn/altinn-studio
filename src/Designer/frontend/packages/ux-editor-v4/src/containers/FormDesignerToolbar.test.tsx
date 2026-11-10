import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { FormDesignerToolbar } from './FormDesignerToolbar';
import { renderWithProviders } from '../testing/mocks';

vi.mock('app-shared/utils/featureToggleUtils', async () => ({
  ...(await vi.importActual('app-shared/utils/featureToggleUtils')),
  shouldDisplayFeature: vi.fn(),
}));

vi.mock('./BreadcrumbsTaskNavigation', () => ({
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
