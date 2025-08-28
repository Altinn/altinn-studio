import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioRadioGroup, useStudioRadioGroup } from './';

describe('StudioRadioGroup components', () => {
  it('renders heading, description, and tag text', () => {
    renderRadioGroup();

    expect(getText(label)).toBeInTheDocument();
    expect(getText(description)).toBeInTheDocument();
    expect(getText(tagTextRequired)).toBeInTheDocument();
  });

  it('renders all radio items with correct labels', () => {
    renderRadioGroup();

    options.forEach((option) => {
      expect(getLabelText(option)).toBeInTheDocument();
    });
  });

  it('marks radio items as invalid when hasError is true', () => {
    renderRadioGroup({ hasError: true });

    options.forEach((option) => {
      expect(getLabelText(option)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('does not mark radio items as invalid when hasError is false', () => {
    renderRadioGroup({ hasError: false });

    options.forEach((option) => {
      expect(getLabelText(option)).toHaveAttribute('aria-invalid', 'false');
    });
  });

  it('renders validation error message when present', () => {
    renderRadioGroup({ hasError: true });
    expect(getText(errorMessage)).toBeInTheDocument();
  });
});

type Props = {
  hasError?: boolean;
  tagText?: string;
};

function renderRadioGroup({
  hasError = false,
  tagText = tagTextRequired,
}: Partial<Props> = {}): RenderResult {
  const Component = (): ReactElement => {
    const { getRadioProps, validationMessageProps } = useStudioRadioGroup({
      name: radioGroupName,
      value: '',
      error: hasError ? errorMessage : undefined,
    });

    return (
      <StudioRadioGroup legend={label} description={description} tagText={tagText} required>
        {options.map((option) => (
          <StudioRadioGroup.Item
            key={option}
            label={option}
            hasError={hasError}
            getRadioProps={getRadioProps(option)}
          />
        ))}
        {hasError && <StudioRadioGroup.Error validationMessageProps={validationMessageProps} />}
      </StudioRadioGroup>
    );
  };
  return render(<Component />);
}

const radioGroupName: string = 'test-radio-group';
const errorMessage: string = 'Error';
const options: string[] = ['Option 1', 'Option 2', 'Option 3'];
const label: string = 'My label';
const description: string = 'My description';
const tagTextRequired: string = 'Required';

const getText = (text: string): HTMLParagraphElement => screen.getByText(text);
const getLabelText = (labelText: string): HTMLLabelElement => screen.getByLabelText(labelText);
