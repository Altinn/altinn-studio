import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioIconViewer } from './StudioIconViewer';

describe('StudioIconViewer', () => {
  it('should render the component', () => {
    const { getByLabelText } = renderStudioIconViewer();
    expect(getByLabelText('Icon search')).toBeInTheDocument();
  });

  it('should display all icons by default', () => {
    renderStudioIconViewer();
    const iconNames = screen.getAllByText(/Icon$/);
    expect(iconNames.length).toBeGreaterThan(0);
  });

  it('should filter icons when searching', () => {
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    fireEvent.change(searchInput, { target: { value: 'airplane' } });
    const iconNames = screen.getAllByText(/Icon$/);
    expect(iconNames.length).toBeGreaterThan(0);
  });

  it('should show no results when search has no matches', () => {
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    fireEvent.change(searchInput, { target: { value: 'nonexistenticon' } });
    const iconNames = screen.queryAllByText(/Icon$/);
    expect(iconNames.length).toBe(0);
  });

  it('should clear search results when input is cleared', () => {
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    fireEvent.change(searchInput, { target: { value: 'airplane' } });
    fireEvent.change(searchInput, { target: { value: '' } });
    const iconNames = screen.getAllByText(/Icon$/);
    expect(iconNames.length).toBeGreaterThan(0);
  });

  it('should be case insensitive when searching', () => {
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    fireEvent.change(searchInput, { target: { value: 'AIRPLANE' } });
    const uppercaseResults = screen.getAllByText(/Icon$/);
    fireEvent.change(searchInput, { target: { value: 'airplane' } });
    const lowercaseResults = screen.getAllByText(/Icon$/);
    expect(uppercaseResults.length).toBe(lowercaseResults.length);
  });
});

function renderStudioIconViewer(): RenderResult {
  return render(<StudioIconViewer />);
}
