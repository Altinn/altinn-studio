import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioLanguagePicker } from './StudioLanguagePicker';
import type { StudioLanguagePickerProps } from './StudioLanguagePicker';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { studioTest } from '@studio/ui-test';
import { defaultProps, texts, twoLetterCodes, threeLetterCodes } from './test-data/props';
import { UncontrolledLanguagePicker } from './test-data/UncontrolledLanguagePicker';

describe('StudioLanguagePicker', () => {
  it('Renders a combobox with the given label', () => {
    renderLanguagePicker();
    expect(screen.getByRole('combobox', { name: texts.label })).toBeInTheDocument();
  });

  it.each([
    ['two', twoLetterCodes],
    ['three', threeLetterCodes],
  ])('Renders an option for each language when using %s-letter codes', (_, languageCodes) => {
    renderLanguagePicker({ languageCodes });
    languageCodes.forEach((l) => {
      expect(screen.getByRole('option', { name: l })).toBeInTheDocument();
    });
  });

  it('Renders an add button', () => {
    renderLanguagePicker();
    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
  });

  it('Selects the first item in the list by default', () => {
    renderLanguagePicker();
    expect(getLanguageInput()).toHaveValue(twoLetterCodes[0]);
  });

  it('Calls onRemove with the selected language when the user clicks the delete button and accepts', async () => {
    const user = setupUser();
    const onRemove = jest.fn();
    renderLanguagePicker({ onRemove });

    await user.pickLanguage(twoLetterCodes[1]);
    studioTest.mockNextConfirmDialog(true);
    await user.clickRemove();

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(twoLetterCodes[1]);
  });

  it('Selects another language and calls onSelect with it when the user clicks the delete button and accepts', async () => {
    const user = setupUser();
    const onSelect = jest.fn();
    renderLanguagePicker({ onSelect });

    await user.pickLanguage(twoLetterCodes[1]);
    studioTest.mockNextConfirmDialog(true);
    await user.clickRemove();

    const expectedValueAfterRemove = twoLetterCodes[0];
    const numberOfManualSelections = 1;
    const numberOfRemovals = 1;
    expect(getLanguageInput()).toHaveValue(expectedValueAfterRemove);
    expect(onSelect).toHaveBeenCalledTimes(numberOfManualSelections + numberOfRemovals);
    expect(onSelect).toHaveBeenLastCalledWith(expectedValueAfterRemove);
  });

  it('Renders the combobox as disabled when the list of languages is empty', async () => {
    renderLanguagePicker({ languageCodes: [] });
    expect(getLanguageInput()).toBeDisabled();
  });

  it('Does not render the delete button when the list of languages is empty', async () => {
    renderLanguagePicker({ languageCodes: [] });
    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('Renders an add button and no input field by default', () => {
    renderLanguagePicker();
    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Renders the new language input field together with an add button when the add button is clicked', async () => {
    const user = setupUser();
    renderLanguagePicker();

    await user.clickAdd();

    expect(screen.getByRole('textbox', { name: texts.newLanguageCode })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
  });

  it('Focuses on the new language input field when the add button is clicked', async () => {
    const user = setupUser();
    renderLanguagePicker();
    await user.clickAdd();
    expect(screen.getByRole('textbox', { name: texts.newLanguageCode })).toHaveFocus();
  });

  it.each([
    ['two', twoLetterCodes, 'el'],
    ['three', threeLetterCodes, 'ell'],
  ])(
    'Calls the onAdd callback with the new code when a valid %s-letter language code is entered',
    async (_, languageCodes, newCode) => {
      const user = setupUser();
      const onAdd = jest.fn();
      renderLanguagePicker({ languageCodes, onAdd });

      await user.clickAdd();
      await user.typeNewLanguageCode(newCode);
      await user.clickAdd();

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(newCode);
    },
  );

  it('Does not call the onAdd callback when an already existing language code is entered', async () => {
    const user = setupUser();
    const onAdd = jest.fn();
    renderLanguagePicker({ onAdd });

    await user.clickAdd();
    await user.typeNewLanguageCode(twoLetterCodes[0]);
    await user.clickAdd();

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('Does not call the onAdd callback when nothing is entered', async () => {
    const user = setupUser();
    const onAdd = jest.fn();
    renderLanguagePicker({ onAdd });

    await user.clickAdd();
    await user.clickAdd();

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('Invalidates the input field when an already existing language code is entered', async () => {
    const user = setupUser();
    renderLanguagePicker();

    await user.clickAdd();
    await user.typeNewLanguageCode(twoLetterCodes[0]);

    expect(getNewLanguageInput()).toBeInvalid();
  });

  it('Invalidates the input field when nothing is entered', async () => {
    const user = setupUser();
    renderLanguagePicker();
    await user.clickAdd();
    expect(getNewLanguageInput()).toBeInvalid();
  });

  it('Calls the onSelect callback when the user selects a language code', async () => {
    const user = setupUser();
    const onSelect = jest.fn();
    renderLanguagePicker({ onSelect });

    await user.pickLanguage(twoLetterCodes[1]);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(twoLetterCodes[1]);
  });

  describe('When wrapped in controlling component', () => {
    it('Renders without the removed language code when a language is removed', async () => {
      const user = setupUser();
      renderUncontrolledLanguagePicker();

      await user.pickLanguage(twoLetterCodes[1]);
      studioTest.mockNextConfirmDialog(true);
      await user.clickRemove();

      expect(screen.queryByRole('option', { name: twoLetterCodes[1] })).not.toBeInTheDocument();
    });

    it('Disables the language field when the last language is removed', async () => {
      const user = setupUser();
      renderUncontrolledLanguagePicker({ languageCodes: [twoLetterCodes[1]] });

      studioTest.mockNextConfirmDialog(true);
      await user.clickRemove();

      expect(getLanguageInput()).toBeDisabled();
    });

    it('Selects the new language code when it is added', async () => {
      const user = setupUser();
      renderUncontrolledLanguagePicker();
      const newLanguageCode = 'el';

      await user.clickAdd();
      await user.typeNewLanguageCode(newLanguageCode);
      await user.clickAdd();

      expect(getLanguageInput()).toHaveValue(newLanguageCode);
    });
  });
});

function renderLanguagePicker(props: Partial<StudioLanguagePickerProps> = {}): RenderResult {
  return render(<StudioLanguagePicker {...defaultProps} {...props} />);
}

interface ExtendedUserEvent extends UserEvent {
  pickLanguage(code: string): Promise<void>;
  clickRemove(): Promise<void>;
  clickAdd(): Promise<void>;
  typeNewLanguageCode(code: string): Promise<void>;
}

function setupUser(): ExtendedUserEvent {
  return {
    ...userEvent.setup(),
    async pickLanguage(code: string): Promise<void> {
      await this.selectOptions(getLanguageInput(), getLanguageOption(code));
    },
    async clickRemove(): Promise<void> {
      await this.click(screen.getByRole('button', { name: texts.remove }));
    },
    async clickAdd(): Promise<void> {
      await this.click(screen.getByRole('button', { name: texts.add }));
    },
    async typeNewLanguageCode(code: string): Promise<void> {
      await this.type(getNewLanguageInput(), code);
    },
  };
}

function getLanguageInput(): HTMLElement {
  return screen.getByRole('combobox', { name: texts.label });
}

function getLanguageOption(language: string): HTMLElement {
  return screen.getByRole('option', { name: language });
}

function getNewLanguageInput(): HTMLElement {
  return screen.getByRole('textbox', { name: texts.newLanguageCode });
}

function renderUncontrolledLanguagePicker(
  props: Partial<StudioLanguagePickerProps> = {},
): RenderResult {
  return render(<UncontrolledLanguagePicker {...defaultProps} {...props} />);
}
