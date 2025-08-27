import React from 'react';
import { SelectSubformSection } from './SelectSubformSection';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const subform1 = 'subformLayoutSetId';
const subform2 = 'subformLayoutSetId2';
const subformLayoutSetsIds = [subform1, subform2];
const onComponentUpdate = jest.fn();

describe('SelectLayoutSet', () => {
  afterEach(jest.clearAllMocks);

  const selectSubform = async () => {
    const user = userEvent.setup();
    const subformSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set_label'),
    });
    await user.selectOptions(subformSelector, subform1);
  };

  it('should render subform selector with 3 options (1 dummy)', () => {
    renderSelectSubformSection();

    const selectLayoutSet = screen.getByRole('combobox');
    expect(selectLayoutSet).toBeInTheDocument();

    const dummyOption = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set'),
    });
    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toBe(dummyOption);
  });

  it('should call onComponentUpdate when selecting a subform and click save', async () => {
    const user = userEvent.setup();
    renderSelectSubformSection();

    await selectSubform();
    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.subform.save_button'),
      }),
    );
    expect(onComponentUpdate).toHaveBeenCalledTimes(1);
    expect(onComponentUpdate).toHaveBeenCalledWith(subform1);
  });

  it('should disable save button until user has selected a subform', async () => {
    renderSelectSubformSection();

    const saveButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.save_button'),
    });
    expect(saveButton).toBeDisabled();
    await selectSubform();
    expect(saveButton).not.toBeDisabled();
  });
});

const renderSelectSubformSection = () => {
  render(
    <SelectSubformSection
      recommendedNextActionText={{ title: 'title', description: 'description' }}
      onComponentUpdate={onComponentUpdate}
      setShowCreateSubformCard={jest.fn()}
      subformLayoutSetsIds={subformLayoutSetsIds}
    />,
  );
};
