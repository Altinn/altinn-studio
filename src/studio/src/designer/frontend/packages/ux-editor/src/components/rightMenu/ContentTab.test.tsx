import React from 'react';
import { ContentTab } from './ContentTab';
import { renderWithMockStore } from '../../testing/mocks';
import { screen } from '@testing-library/react';

// Test data:
const textResourceEditTestId = 'text-resource-edit';

// Mocks:
jest.mock('../TextResourceEdit', () => ({
  TextResourceEdit: () => <div data-testid={textResourceEditTestId} />
}));

describe('ContentTab', () => {
  it('Renders TextResourceEdit component', () => {
    renderWithMockStore()(<ContentTab />);
    expect(screen.getByTestId(textResourceEditTestId)).toBeInTheDocument();
  });
});
