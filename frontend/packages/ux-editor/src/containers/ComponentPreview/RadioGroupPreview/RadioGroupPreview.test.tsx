import React from 'react';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import { IOption } from '../../../types/global';
import type { ITextResource } from 'app-shared/types/global';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { last } from 'app-shared/utils/arrayUtils';
import { ComponentType } from '../../../components';
import { RadioGroupPreview, RadioGroupPreviewProps } from './RadioGroupPreview';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from '../../../../../../app-development/hooks/queries/useTextResourcesQuery';
import type { FormRadioButtonsComponent } from '../../../types/FormComponent';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
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
const component: FormRadioButtonsComponent = {
  id: '1',
  options,
  optionsId: '',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: titleTextKey,
    description: descriptionTextKey,
  },
  itemType: 'COMPONENT',
  dataModelBindings: {},
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

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('RadioGroupPreview', () => {
  afterEach(jest.restoreAllMocks);

  it('Renders radio group with legend, description and given options', async () => {
    await render();
    expect(screen.getByText(titleText)).toBeInTheDocument();
    expect(screen.getByText(descriptionText)).toBeInTheDocument();
    expect(screen.getByText(option1Text)).toBeInTheDocument();
    expect(screen.getByText(option2Text)).toBeInTheDocument();
  });

  it('Renders button to add option by default', async () => {
    await render();
    expect(screen.getByRole('button', { name: addOptionText })).toBeInTheDocument();
  });

  it('Does not render button to add option if optionsId is set', async () => {
    await render({ component: { ...component, optionsId: '1' } });
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
    await act(() => user.click(addOptionButton));
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
    await act(() => user.click(cancelButton));
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
    await act(() => user.clear(valueInput));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(emptyErrorText);
  });

  it('Renders correct error message when an existing value is given in the add section', async () => {
    await renderAndOpenAddSection();
    const valueInput = screen.getByLabelText(valueText);
    expect(valueInput).not.toHaveValue('');
    await act(() => user.clear(valueInput));
    await act(() => user.type(valueInput, option1Value));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(duplicateErrorText);
  });
});

const render = async (props: Partial<RadioGroupPreviewProps> = {}) => {

  const { result } = renderHookWithMockStore({}, {
    getTextResources: () => Promise.resolve({ language: 'nb', resources: nbTextResources }),
  })(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  return renderWithMockStore()(
    <RadioGroupPreview
      {...defaultProps}
      {...props}
    />
  );
};

const renderAndOpenAddSection = async (props?: Partial<RadioGroupPreviewProps>) => {
  await render(props);
  const openAddSectionButton = screen.getByRole('button', { name: addOptionText });
  await act(() => user.click(openAddSectionButton));
};
