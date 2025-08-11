import React from 'react';
import { render, screen, type RenderResult } from '@testing-library/react';
import { StudioSuggestion, type StudioSuggestionProps } from './StudioSuggestion';
import {
  StudioSuggestionOption,
  type StudioSuggestionOptionProps,
} from './StudioSuggestionOption/StudioSuggestionOption';

describe('StudioSuggestion', () => {
  it('should render', () => {
    renderStudioSuggestion();

    expect(screen.getByText(defaultProps.legend)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();
  });

  it('renders options', () => {
    renderStudioSuggestion();

    defaultOptions.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('should render required label', () => {
    renderStudioSuggestion({
      suggestionProps: { required: true, tagText: 'required', emptyText: 'Empty text' },
    });

    expect(screen.getByText('required')).toBeInTheDocument();
  });
});

const defaultOptions = [
  {
    label: 'Option 1',
    value: '1',
  },
  {
    label: 'Option 2',
    value: '2',
  },
];

const defaultProps = {
  emptyText: 'Empty text',
  legend: 'Legend text',
  description: 'Description text',
};

type renderStudioSuggestionProps = {
  suggestionProps?: StudioSuggestionProps;
  options?: StudioSuggestionOptionProps[];
};

function renderStudioSuggestion({
  suggestionProps = defaultProps,
  options = defaultOptions,
}: renderStudioSuggestionProps = {}): RenderResult {
  return render(
    <StudioSuggestion {...suggestionProps}>
      {options.map((option) => (
        <StudioSuggestionOption key={option.label} value={option.value} label={option.label}>
          {option.label}
        </StudioSuggestionOption>
      ))}
    </StudioSuggestion>,
  );
}
