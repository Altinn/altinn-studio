import React from 'react';
import { render, screen } from '@testing-library/react';
import AltinnSubstatusPaper from './AltinnSubstatusPaper';

describe('AltinnSubstatusPaper', () => {
  it('should render label and description', () => {
    render(
      <AltinnSubstatusPaper
        label='The label'
        description='The description'
      />,
    );

    expect(screen.getByText(/the label/i)).toBeInTheDocument();
    expect(screen.getByText(/the description/i)).toBeInTheDocument();
  });
});
