import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCheckboxGroup, useStudioCheckboxGroup } from './';

describe('StudioCheckboxGroup components', () => {
  it('renders heading, description, and tag text', () => {
    renderCheckboxGroup();

    expect(getText(label)).toBeInTheDocument();
    expect(getText(description)).toBeInTheDocument();
    expect(getText(tagTextRequired)).toBeInTheDocument();
  });

  it('renders all checkbox items with correct labels', () => {
    renderCheckboxGroup();

    options.forEach((option) => {
      expect(getLabelText(option)).toBeInTheDocument();
    });
  });

  it('marks checkbox items as invalid when hasError is true', () => {
    renderCheckboxGroup({ hasError: true });

    options.forEach((option) => {
      expect(getLabelText(option)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('does not mark checkbox items as invalid when hasError is false', () => {
    renderCheckboxGroup({ hasError: false });

    options.forEach((option) => {
      expect(getLabelText(option)).toHaveAttribute('aria-invalid', 'false');
    });
  });

  it('pre-selects checkboxes when value is provided', () => {
    const selectedOptions: string[] = ['Option 1', 'Option 3'];
    renderCheckboxGroup({ initialValue: selectedOptions });

    selectedOptions.forEach((option: string) => {
      expect(getLabelText(option)).toBeChecked();
    });

    options
      .filter((option: string) => !selectedOptions.includes(option))
      .forEach((option: string) => {
        expect(getLabelText(option)).not.toBeChecked();
      });
  });

  it('renders validation error message when present', () => {
    renderCheckboxGroup({ hasError: true });
    expect(getText(errorMessage)).toBeInTheDocument();
  });
});

type Props = {
  hasError?: boolean;
  tagText?: string;
  initialValue?: string[];
};

function renderCheckboxGroup({
  hasError = false,
  tagText = tagTextRequired,
  initialValue = [],
}: Partial<Props> = {}): RenderResult {
  const Component = (): ReactElement => {
    const { getCheckboxProps, validationMessageProps } = useStudioCheckboxGroup({
      name: checkboxGroupName,
      value: initialValue,
      error: hasError ? errorMessage : undefined,
    });

    return (
      <StudioCheckboxGroup>
        <StudioCheckboxGroup.Heading
          label={label}
          description={description}
          tagText={tagText}
          required
        />
        {options.map((option) => (
          <StudioCheckboxGroup.Item
            key={option}
            label={option}
            hasError={hasError}
            getCheckboxProps={getCheckboxProps(option)}
          />
        ))}
        {hasError && <StudioCheckboxGroup.Error validationMessageProps={validationMessageProps} />}
      </StudioCheckboxGroup>
    );
  };
  return render(<Component />);
}

const checkboxGroupName: string = 'test-checkbox-group';
const errorMessage: string = 'Error';
const options: string[] = ['Option 1', 'Option 2', 'Option 3'];
const label: string = 'My label';
const description: string = 'My description';
const tagTextRequired: string = 'Required';

const getText = (text: string): HTMLParagraphElement => screen.getByText(text);
const getLabelText = (labelText: string): HTMLLabelElement => screen.getByLabelText(labelText);
