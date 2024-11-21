import React from 'react';
import { SelectLayoutSet } from './SelectLayoutSet';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSetsMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const subform1 = 'subformLayoutSetId';
const subform2 = 'subformLayoutSetId2';

const layoutSets = {
  ...layoutSetsMock,
  sets: [
    { id: subform1, type: 'subform' },
    { id: subform2, type: 'subform' },
  ],
};

describe('SelectLayoutSet', () => {
  afterEach(jest.clearAllMocks);

  it('should render the select layout set component with 3 options (1 dummy)', () => {
    const setSelectedSubform = jest.fn();
    renderSelectLayoutSet({ setSelectedSubform, selectedSubform: undefined });

    const selectLayoutSet = screen.getByRole('combobox');
    expect(selectLayoutSet).toBeInTheDocument();

    const dummyOption = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set'),
    });
    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toBe(dummyOption);
  });

  it('should call setSelectedSubform when selecting a subform', async () => {
    const setSelectedSubform = jest.fn();
    const user = userEvent.setup();
    renderSelectLayoutSet({ setSelectedSubform, selectedSubform: undefined });

    const selectLayoutSet = screen.getByRole('combobox');
    await user.selectOptions(selectLayoutSet, subform2);

    expect(setSelectedSubform).toHaveBeenCalledTimes(1);
    expect(setSelectedSubform).toHaveBeenCalledWith(subform2);
  });

  it('should display the selected subform layout set in document', () => {
    const setSelectedSubform = jest.fn();
    renderSelectLayoutSet({ setSelectedSubform, selectedSubform: subform1 });

    const selectLayoutSet = screen.getByRole('combobox');
    expect(selectLayoutSet).toHaveValue(subform1);
  });
});

type SelectLayoutSetProps = {
  setSelectedSubform: (layoutSetId: string) => void;
  selectedSubform: string;
};

const renderSelectLayoutSet = ({ setSelectedSubform, selectedSubform }: SelectLayoutSetProps) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);

  renderWithProviders(
    <SelectLayoutSet setSelectedSubform={setSelectedSubform} selectedSubform={selectedSubform} />,
    { queryClient },
  );
};
