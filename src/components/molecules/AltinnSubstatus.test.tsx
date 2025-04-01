import React from 'react';

import { screen } from '@testing-library/react';

import { AltinnSubstatus } from 'src/components/molecules/AltinnSubstatus';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('AltinnSubstatus', () => {
  it('should render label and description', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => (
        <AltinnSubstatus
          label='The label'
          description='The description'
        />
      ),
    });

    expect(screen.getByText(/the label/i)).toBeInTheDocument();
    expect(screen.getByText(/the description/i)).toBeInTheDocument();
  });
});
