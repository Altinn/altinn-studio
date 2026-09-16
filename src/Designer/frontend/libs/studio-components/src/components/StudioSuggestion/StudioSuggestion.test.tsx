import type { ForwardedRef } from 'react';
import React from 'react';
import { fireEvent, render, screen, type RenderResult } from '@testing-library/react';
import { StudioSuggestion } from '.';
import { type StudioSuggestionOptionProps } from './StudioSuggestionOption/StudioSuggestionOption';
import type { StudioSuggestionItem } from './StudioSuggestionItem/StudioSuggestionItem';
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

  it('renders the placeholder on the input when given', () => {
    const placeholder = 'Search…';
    renderStudioSuggestion({ suggestionProps: { placeholder } });

    expect(getInput()).toHaveAttribute('placeholder', placeholder);
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

  // Emptying the field reaches onSelectedChange only when the field loses focus, and the underlying
  // web component defers that to a timer — so a click that unmounts the field in the same gesture,
  // like a click on the process editor canvas, used to take the change with it. The change is
  // reported while the focus is moving instead. The web component does not upgrade in jsdom, which
  // is exactly the point: emptying the input and moving the focus is all these tests need.
  describe('when the user empties the field', () => {
    it('reports the cleared selection when the focus leaves the field', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      showSelectedOption();
      emptyField();
      fireEvent.focusOut(getInput());

      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledWith(null);
    });

    it('does not report a cleared selection when the field still holds text', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      showSelectedOption();
      setFieldText('Opt');
      fireEvent.focusOut(getInput());

      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it('does not report a cleared selection when nothing is selected', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: null, onSelectedChange } });

      showSelectedOption();
      emptyField();
      fireEvent.focusOut(getInput());

      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it('does not report a cleared selection when several values can be selected', () => {
      // A multiple select keeps its values outside the input, which is empty whenever the user is
      // not typing in it.
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({
        suggestionProps: { multiple: true, selected: [selectedOption], onSelectedChange },
      });

      showSelectedOption();
      emptyField();
      fireEvent.focusOut(getInput());

      expect(onSelectedChange).not.toHaveBeenCalled();
    });
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

const selectedOption: StudioSuggestionItem = { value: '1', label: 'Option 1' };

function getInput(label: string = defaultProps.label): HTMLInputElement {
  return screen.getByLabelText(label);
}

// In a browser the web component writes the selected label into the input; jsdom leaves it empty,
// so these tests put the text there themselves before taking it away again.
function setFieldText(text: string): void {
  getInput().value = text;
}

function showSelectedOption(): void {
  setFieldText(selectedOption.label);
}

function emptyField(): void {
  setFieldText('');
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
