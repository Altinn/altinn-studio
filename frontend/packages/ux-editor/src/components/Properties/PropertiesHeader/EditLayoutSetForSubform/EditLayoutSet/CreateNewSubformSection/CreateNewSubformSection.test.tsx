import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { CreateNewSubformSection } from './CreateNewSubformSection';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import { layoutSets } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const setShowCreateSubformCardMock = jest.fn();
const onComponentUpdate = jest.fn();
const dataModelIds = ['dataModel1', 'dataModel2'];

describe('CreateNewSubformLayoutSet ', () => {
  afterEach(jest.clearAllMocks);

  it('displays the card with label, input field and data model select', () => {
    renderCreateNewSubformLayoutSet({});
    const subformNameInput = screen.getByRole('textbox');
    const dataModelSelect = screen.getByRole('combobox');

    expect(subformNameInput).toBeInTheDocument();
    expect(dataModelSelect).toBeInTheDocument();
  });

  it('displays the save button and close button', () => {
    renderCreateNewSubformLayoutSet({});
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });

    expect(saveButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
  });

  it('displays not the close button when hasSubforms is false', () => {
    renderCreateNewSubformLayoutSet({ hasSubforms: false });
    const closeButton = screen.queryByRole('button', { name: textMock('general.close') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays the close button when data model input is rendered', async () => {
    const user = userEvent.setup();

    renderCreateNewSubformLayoutSet({ hasSubforms: false });

    const displayDataModelInput = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_new_data_model'),
    });
    await user.click(displayDataModelInput);

    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);

    expect(
      screen.queryByRole('button', { name: textMock('general.close') }),
    ).not.toBeInTheDocument();
  });

  it('calls onComponentUpdate when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet({});
    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');
    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, [dataModelIds[0]]);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(onComponentUpdate).toHaveBeenCalledTimes(1);
    expect(onComponentUpdate).toHaveBeenCalledWith('NewSubform');
  });

  it('displays loading spinner when save button is clicked', async () => {
    const user = userEvent.setup();
    const addLayoutSetMock = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        }),
    );
    renderCreateNewSubformLayoutSet({
      queries: { addLayoutSet: addLayoutSetMock },
    });

    await user.type(screen.getByRole('textbox'), 'NewSubform');
    await user.selectOptions(screen.getByRole('combobox'), [dataModelIds[0]]);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    const spinner = await screen.findByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('disables the save button when subform name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet({});

    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, [dataModelIds[0]]);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();

    const input = screen.getByRole('textbox');
    await user.type(input, 'æøå');
    expect(saveButton).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'NewSubform');

    expect(saveButton).not.toBeDisabled();
  });

  it('disables the save button when data model is not selected', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet({});

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when both input and data model is valid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet({});

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');

    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, [dataModelIds[0]]);

    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(saveButton).not.toBeDisabled();
  });

  it('disables save button when input for new data model is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet({});

    await user.type(screen.getByRole('textbox'), 'subform1');

    const createNewDataModel = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_new_data_model'),
    });
    await user.click(createNewDataModel);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();

    const dataModelInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.component_properties.subform.create_new_data_model_label'),
    });
    await user.type(dataModelInput, 'datamodel');
    expect(saveButton).not.toBeDisabled();
  });
});

type RenderCreateNewSubformLayoutSetProps = {
  layoutSetsMock?: LayoutSets;
  hasSubforms?: boolean;
  queries?: Partial<ServicesContextProps>;
};

const renderCreateNewSubformLayoutSet = ({
  layoutSetsMock = layoutSets,
  hasSubforms = true,
  queries,
}: RenderCreateNewSubformLayoutSetProps) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadataModelIds, org, app, false], dataModelIds);

  return renderWithProviders(
    <CreateNewSubformSection
      layoutSets={layoutSetsMock}
      setShowCreateSubformCard={setShowCreateSubformCardMock}
      onComponentUpdate={onComponentUpdate}
      hasSubforms={hasSubforms}
      recommendedNextActionText={{ title: 'title', description: 'description' }}
    />,
    {
      queries: { ...queriesMock, ...queries },
      queryClient,
    },
  );
};