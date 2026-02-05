import React, { type ForwardedRef } from 'react';
import { render, screen, type RenderResult } from '@testing-library/react';
import { StudioSuggestion } from '.';
import { type StudioSuggestionOptionProps } from './StudioSuggestionOption/StudioSuggestionOption';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import type { StudioSuggestionProps } from './StudioSuggestion';

describe('StudioSuggestion', () => {
  it('should render', () => {
    renderStudioSuggestion();

    expect(screen.getByLabelText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders options', () => {
    renderStudioSuggestion();

    defaultOptions.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('should render required label', () => {
    renderStudioSuggestion({
      suggestionProps: { required: true, tagText: 'required' },
    });

    expect(screen.getByText('required')).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) =>
      renderStudioSuggestion({ suggestionProps: { className } }),
    );
  });

  it('Forwards the ref to the button element if given', () => {
    testRefForwarding<React.ElementRef<typeof StudioSuggestion>>(
      (ref) => renderStudioSuggestion({}, ref),
      () => getInput(),
    );
  });
});

const defaultOptions: (StudioSuggestionOptionProps & { label: string })[] = [
  {
    label: 'Option 1',
    value: '1',
  },
  {
    label: 'Option 2',
    value: '2',
  },
];

const defaultProps: StudioSuggestionProps = {
  emptyText: 'Empty text',
  label: 'Label text',
};

type RenderStudioSuggestionProps = {
  suggestionProps?: Partial<StudioSuggestionProps>;
  options?: StudioSuggestionOptionProps[];
};

function getInput(label: string = defaultProps.label): HTMLInputElement {
  return screen.getByLabelText(label);
}

function renderStudioSuggestion(
  { suggestionProps, options = defaultOptions }: RenderStudioSuggestionProps = {},
  ref?: ForwardedRef<React.ElementRef<typeof StudioSuggestion>>,
): RenderResult {
  const props = { ...defaultProps, ...suggestionProps } as StudioSuggestionProps;
  return render(
    <StudioSuggestion {...props} ref={ref}>
      {options.map((option) => (
        <StudioSuggestion.Option key={option.label} value={option.value} label={option.label}>
          {option.label}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>,
  );
}
