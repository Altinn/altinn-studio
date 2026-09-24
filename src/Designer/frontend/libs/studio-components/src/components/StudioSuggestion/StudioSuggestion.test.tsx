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

  // The web component does not upgrade in jsdom, so the tests set the input text and move focus.
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

    it('reports the clear once when the web component reports it before the focus leaves', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      showSelectedOption();
      emptyField();
      reportClearFromWebComponent();
      fireEvent.focusOut(getInput());

      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledWith(null);
    });

    it('reports the clear once when the web component reports it after the focus left', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      showSelectedOption();
      emptyField();
      fireEvent.focusOut(getInput());
      reportClearFromWebComponent();

      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledWith(null);
    });

    it('reports a clear again after a new selection', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      reportClearFromWebComponent();
      reportSelectionFromWebComponent(defaultOptions[1]);
      reportClearFromWebComponent();

      expect(onSelectedChange).toHaveBeenCalledTimes(3);
      expect(onSelectedChange).toHaveBeenLastCalledWith(null);
    });

    it('reports a clear again after the field was focused again', () => {
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { selected: selectedOption, onSelectedChange } });

      reportClearFromWebComponent();
      fireEvent.focusIn(getInput());
      reportClearFromWebComponent();

      expect(onSelectedChange).toHaveBeenCalledTimes(2);
    });

    it('does not report a cleared selection when several values can be selected', () => {
      // A multiple select keeps its values as chips; its input is empty unless the user is typing.
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

// In a browser the web component writes the selected label into the input; jsdom does not.
function setFieldText(text: string): void {
  getInput().value = text;
}

function showSelectedOption(): void {
  setFieldText(selectedOption.label);
}

function emptyField(): void {
  setFieldText('');
}

// The design system turns the web component's `comboboxbeforeselect` into a selection report: a
// connected option means the selection was removed, a detached one means it was added.
function reportFromWebComponent(option: HTMLElement): void {
  const event = new CustomEvent('comboboxbeforeselect', {
    detail: option,
    bubbles: true,
    cancelable: true,
  });
  fireEvent(getInput(), event);
}

function reportClearFromWebComponent(): void {
  reportFromWebComponent(screen.getByRole('option', { name: selectedOption.label, hidden: true }));
}

function reportSelectionFromWebComponent(option: StudioSuggestionOptionProps): void {
  const detachedOption = document.createElement('u-option');
  detachedOption.setAttribute('value', String(option.value));
  detachedOption.textContent = String(option.label);
  Object.defineProperty(detachedOption, 'value', { value: option.value });
  reportFromWebComponent(detachedOption);
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
