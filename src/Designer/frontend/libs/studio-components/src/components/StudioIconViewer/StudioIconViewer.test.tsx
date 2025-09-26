import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { StudioIconViewer } from './StudioIconViewer';
import userEvent from '@testing-library/user-event';

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

  it('should filter icons when searching', async () => {
    const user = userEvent.setup();
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    const initialIconCount = screen.getAllByText(/Icon$/).length;
    expect(initialIconCount).toBeGreaterThan(0);
    await user.type(searchInput, 'airplane');
    const filteredIconCount = screen.getAllByText(/Icon$/).length;
    expect(filteredIconCount).toBeLessThan(initialIconCount);
    expect(filteredIconCount).toBeGreaterThan(0);
  });

  it('should show no results when search has no matches', async () => {
    const user = userEvent.setup();
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    await user.type(searchInput, 'nonexistenticon');
    const iconNames = screen.queryAllByText(/Icon$/);
    expect(iconNames.length).toBe(0);
  });

  it('should clear search results when input is cleared', async () => {
    const user = userEvent.setup();
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    await user.type(searchInput, 'airplane');
    await user.clear(searchInput);
    const iconNames = screen.getAllByText(/Icon$/);
    expect(iconNames.length).toBeGreaterThan(0);
  });

  it('should be case insensitive when searching', async () => {
    const user = userEvent.setup();
    renderStudioIconViewer();
    const searchInput = screen.getByLabelText('Icon search');
    await user.type(searchInput, 'AIRPLANE');
    const uppercaseResults = screen.getAllByText(/Icon$/);
    await user.clear(searchInput);
    await user.type(searchInput, 'airplane');
    const lowercaseResults = screen.getAllByText(/Icon$/);
    expect(uppercaseResults.length).toBeGreaterThan(0);
    expect(lowercaseResults.length).toBeGreaterThan(0);
    expect(uppercaseResults.length).toBe(lowercaseResults.length);
  });
});

function renderStudioIconViewer(): RenderResult {
  return render(<StudioIconViewer />);
}
