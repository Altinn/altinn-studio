import React from 'react';
import { appDataMock, languageStateMock, renderWithMockStore, textResourcesMock } from '../../../testing/mocks';
import { IFormRadioButtonComponent, IOption, ITextResource } from '../../../types/global';
import { screen } from '@testing-library/react';
import { ITextResourcesState } from '../../../features/appData/textResources/textResourcesSlice';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import { ILanguageState } from '../../../features/appData/language/languageSlice';
import userEvent from '@testing-library/user-event';
import { last } from 'app-shared/utils/arrayUtils';
import { ComponentTypes } from '../../../components';
import { RadioGroupPreview, RadioGroupPreviewProps } from './RadioGroupPreview';

const user = userEvent.setup();

// Test data:
const titleTextKey = 'title';
const descriptionTextKey = 'description';
const titleText = 'Radioknapper';
const descriptionText = 'Velg ett alternativ';
const option1TextKey = 'option1text';
const option1Text = 'Alternativ 1';
const option1Value = 'option1';
const option2TextKey = 'option2text';
const option2Text = 'Alternativ 2';
const option2Value = 'option2';
const options: IOption[] = [
  { label: option1TextKey, value: option1Value },
  { label: option2TextKey, value: option2Value },
];
const component: IFormRadioButtonComponent = {
  id: '1',
  options,
  optionsId: '',
  type: ComponentTypes.RadioButtons,
  textResourceBindings: {
    title: titleTextKey,
    description: descriptionTextKey,
  }
};
const handleComponentChange = jest.fn();
const defaultProps: RadioGroupPreviewProps = {
  component,
  handleComponentChange,
};
const nbTextResources: ITextResource[] = [
  { id: titleTextKey, value: titleText },
  { id: descriptionTextKey, value: descriptionText },
  { id: option1TextKey, value: option1Text },
  { id: option2TextKey, value: option2Text },
];
const addOptionText = 'Legg til alternativ';
const labelText = 'Tekst';
const valueText = 'Verdi';
const addText = 'Legg til';
const cancelText = 'Avbryt';
const emptyErrorText = 'Du må angi en verdi.';
const duplicateErrorText = 'Verdien må være unik.';
const texts = {
  'general.add': addText,
  'general.cancel': cancelText,
  "ux_editor.add_option": addOptionText,
  "ux_editor.add_option_label": labelText,
  "ux_editor.add_option_value": valueText,
  "ux_editor.radios_option_value_error_empty": emptyErrorText,
  "ux_editor.radios_option_value_error_duplicate": duplicateErrorText
};

describe('RadioGroupPreview', () => {
  afterEach(jest.restoreAllMocks);

  it('Renders radio group with legend, description and given options', () => {
    render();
    expect(screen.getByText(titleText)).toBeInTheDocument();
    expect(screen.getByText(descriptionText)).toBeInTheDocument();
    expect(screen.getByText(option1Text)).toBeInTheDocument();
    expect(screen.getByText(option2Text)).toBeInTheDocument();
  });

  it('Renders button to add option by default', () => {
    render();
    expect(screen.getByRole('button', { name: addOptionText })).toBeInTheDocument();
  });

  it('Does not render button to add option if optionsId is set', () => {
    render({ component: { ...component, optionsId: '1' } });
    expect(screen.queryByText(addOptionText)).toBeFalsy();
  });

  it('Renders add section correctly when clicking on add option button', async () => {
    await renderAndOpenAddSection();
    expect(screen.getByText(addOptionText)).toBeInTheDocument();
    expect(screen.getByText(labelText)).toBeInTheDocument();
    expect(screen.getByLabelText(valueText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: cancelText })).toBeInTheDocument();
  });

  it('Calls handleComponentChange with new option when clicking the add option button', async () => {
    await renderAndOpenAddSection();
    const addOptionButton = last(screen.getAllByRole('button', { name: addText }));
    await user.click(addOptionButton);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          ...options,
          expect.objectContaining({
            label: expect.anything(),
            value: expect.anything(),
          })
        ]),
      })
    );
  });

  it('Hides add section when clicking the cancel button', async () => {
    await renderAndOpenAddSection();
    const cancelButton = screen.getByRole('button', { name: cancelText });
    await user.click(cancelButton);
    expect(screen.queryByText(cancelText)).toBeFalsy();
  });

  it('Does not render any error message in the add section by default', async () => {
    await renderAndOpenAddSection();
    expect(screen.queryByRole('alertdialog')).toBeFalsy();
  });

  it('Renders correct error message when no value is given in the add section', async () => {
    await renderAndOpenAddSection();
    const valueInput = screen.getByLabelText(valueText);
    expect(valueInput).not.toHaveValue('');
    await user.clear(valueInput);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(emptyErrorText);
  });

  it('Renders correct error message when an existing value is given in the add section', async () => {
    await renderAndOpenAddSection();
    const valueInput = screen.getByLabelText(valueText);
    expect(valueInput).not.toHaveValue('');
    await user.clear(valueInput);
    await user.type(valueInput, option1Value);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(duplicateErrorText);
  });
});

const render = (props: Partial<RadioGroupPreviewProps> = {}) => {

  const languageState: ILanguageState = {
    ...languageStateMock,
    language: texts,
  };

  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    resources: {
      nb: nbTextResources,
    },
  };

  const appData: IAppDataState = {
    ...appDataMock,
    languageState,
    textResources,
  };

  return renderWithMockStore({ appData })(
    <RadioGroupPreview
      {...defaultProps}
      {...props}
    />
  );
};

const renderAndOpenAddSection = async (props?: Partial<RadioGroupPreviewProps>) => {
  render(props);
  const openAddSectionButton = screen.getByRole('button', { name: addOptionText });
  await user.click(openAddSectionButton);
};
