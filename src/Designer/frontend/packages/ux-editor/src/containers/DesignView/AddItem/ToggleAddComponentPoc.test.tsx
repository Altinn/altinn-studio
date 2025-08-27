import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToggleAddComponentPoc } from './ToggleAddComponentPoc';

describe('ToggleAddComponentPoc', () => {
  it('should render the component', () => {
    render(<ToggleAddComponentPoc />);
    expect(screen.getByText('Prøv nytt design')).toBeInTheDocument();
  });
});
