import { render } from '@testing-library/react';
import { CodeListsPage } from './CodeListsPage';
import React from 'react';

describe('CodeListsPage', () => {
  it('Does not throw any errors during rendering', () => {
    render(<CodeListsPage />);
  });
});
