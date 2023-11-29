import React from 'react';

import { screen } from '@testing-library/react';

import { AltinnSubstatusPaper } from 'src/components/molecules/AltinnSubstatusPaper';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('AltinnSubstatusPaper', () => {
  it('should render label and description', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => (
        <AltinnSubstatusPaper
          label='The label'
          description='The description'
        />
      ),
    });

    expect(screen.getByText(/the label/i)).toBeInTheDocument();
    expect(screen.getByText(/the description/i)).toBeInTheDocument();
  });
});
