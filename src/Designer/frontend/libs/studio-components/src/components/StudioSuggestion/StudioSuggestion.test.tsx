import type { ForwardedRef } from 'react';
import React from 'react';
import { render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioSuggestion, type StudioSuggestionItem } from '.';
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

  it('renders the required tag next to the label text, inside the label', () => {
    // A label inside a field is a block, so a tag placed after it would drop to its own line.
    renderStudioSuggestion({
      suggestionProps: { required: true, tagText: 'required' },
    });

    expect(screen.getByText(defaultProps.label)).toContainElement(screen.getByText('required'));
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

  it('Labels the clear button with the given clearButtonLabel', () => {
    const clearButtonLabel = 'Clear selection';
    renderStudioSuggestion({ suggestionProps: { clearButtonLabel } });
    expect(getClearButton()).toHaveAttribute('aria-label', clearButtonLabel);
  });

  it('Forwards the ref to the button element if given', () => {
    testRefForwarding<React.ElementRef<typeof StudioSuggestion>>(
      (ref) => renderStudioSuggestion({}, ref),
      () => getInput(),
    );
  });

  describe('when Enter is pressed', () => {
    it('keeps the selection when nothing has been typed', async () => {
      const user = userEvent.setup();
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({
        suggestionProps: { defaultSelected: firstItem, multiple: false, onSelectedChange },
      });

      await user.click(getCombobox());
      await user.keyboard('{Enter}');
      await user.tab();

      expect(onSelectedChange).not.toHaveBeenCalled();
      expect(getCombobox()).toHaveValue(firstItem.label);
    });

    it('selects the option whose label is typed', async () => {
      const user = userEvent.setup();
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({ suggestionProps: { multiple: false, onSelectedChange } });

      await user.type(getCombobox(), `${secondItem.label}{Enter}`);

      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledWith(secondItem);
    });

    it('leaves text that matches no option uncommitted', async () => {
      const user = userEvent.setup();
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({
        suggestionProps: { defaultSelected: firstItem, multiple: false, onSelectedChange },
      });

      await user.clear(getCombobox());
      await user.type(getCombobox(), 'Invalid{Enter}');

      expect(onSelectedChange).not.toHaveBeenCalled();
      expect(getCombobox()).toHaveValue(firstItem.label);
    });

    it('adds the option whose label is typed to a multiple selection', async () => {
      const user = userEvent.setup();
      const onSelectedChange = jest.fn();
      renderStudioSuggestion({
        suggestionProps: { defaultSelected: [firstItem], multiple: true, onSelectedChange },
      });

      await user.type(getCombobox(), `${secondItem.label}{Enter}`);

      expect(onSelectedChange).toHaveBeenCalledTimes(1);
      expect(onSelectedChange).toHaveBeenCalledWith([firstItem, secondItem]);
    });

    describe('in a creatable field', () => {
      // Designsystemet logs that the create hint is missing, which its stylesheet provides outside jsdom.
      beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
      afterEach(() => jest.restoreAllMocks());

      it('selects the option whose label is typed rather than creating it', async () => {
        const user = userEvent.setup();
        const onSelectedChange = jest.fn();
        renderStudioSuggestion({
          suggestionProps: { creatable: true, multiple: false, onSelectedChange },
        });

        await user.type(getCombobox(), `${secondItem.label}{Enter}`);

        expect(onSelectedChange).toHaveBeenCalledTimes(1);
        expect(onSelectedChange).toHaveBeenCalledWith(secondItem);
      });

      it('creates typed text that matches no option', async () => {
        const user = userEvent.setup();
        const onSelectedChange = jest.fn();
        renderStudioSuggestion({
          suggestionProps: { creatable: true, multiple: false, onSelectedChange },
        });

        await user.type(getCombobox(), 'New value{Enter}');

        expect(onSelectedChange).toHaveBeenCalledTimes(1);
        expect(onSelectedChange).toHaveBeenCalledWith({ value: 'New value', label: 'New value' });
      });
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

const [firstItem, secondItem]: StudioSuggestionItem[] = defaultOptions.map(({ label, value }) => ({
  label,
  value: String(value),
}));

const defaultProps: StudioSuggestionProps = {
  emptyText: 'Empty text',
  label: 'Label text',
};

type RenderStudioSuggestionProps = {
  suggestionProps?: Partial<StudioSuggestionProps>;
  options?: StudioSuggestionOptionProps[];
};

function getClearButton(): HTMLElement {
  return screen.getByRole('button', { hidden: true });
}

function getInput(label: string = defaultProps.label): HTMLInputElement {
  return screen.getByLabelText(label);
}

function getCombobox(): HTMLInputElement {
  return screen.getByRole('combobox', { name: defaultProps.label });
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
