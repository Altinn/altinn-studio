import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';
import { mockAppMetadata } from '../../../../mocks/applicationMetadataMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const defaultProps = {
  t: textMock,
  appMetadata: mockAppMetadata,
  isAllChecked: false,
  isSomeChecked: false,
  isNoneChecked: false,
  handleTableHeaderCheckboxChange: jest.fn(),
  handleAllowedPartyTypeChange: jest.fn(),
  getPartyTypesAllowedOptions: jest.fn(),
};

const mockedPartyTypesAllowedOptions = [
  { value: 'value1', label: 'Label 1' },
  { value: 'value2', label: 'Label 2' },
];

describe('SelectAllowedPartyTypes', () => {
  it('renders the component', () => {
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the table header checkbox', () => {
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeInTheDocument();
    });
  });

  it('should call handleTableHeaderCheckboxChange when the table header checkbox is clicked', async () => {
    const user = userEvent.setup();
    const handleTableHeaderCheckboxChangeMock = jest.fn();
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        handleTableHeaderCheckboxChange={handleTableHeaderCheckboxChangeMock}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    const headerCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    await waitFor(() => user.click(headerCheckbox));

    expect(handleTableHeaderCheckboxChangeMock).toHaveBeenCalledTimes(1);
  });

  it('should call handleAllowedPartyTypeChange when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const handleAllowedPartyTypeChangeMock = jest.fn();
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        handleAllowedPartyTypeChange={handleAllowedPartyTypeChangeMock}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await waitFor(() => user.click(checkboxes[1]));

    expect(handleAllowedPartyTypeChangeMock).toHaveBeenCalledTimes(1);
  });

  it('should call handleTableHeaderCheckboxChange when the table header checkbox is clicked', async () => {
    const user = userEvent.setup();
    const handleTableHeaderCheckboxChangeMock = jest.fn();
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        handleTableHeaderCheckboxChange={handleTableHeaderCheckboxChangeMock}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    const headerCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    await waitFor(() => user.click(headerCheckbox));

    expect(handleTableHeaderCheckboxChangeMock).toHaveBeenCalledTimes(1);
  });

  it('should call handleAllowedPartyTypeChange when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const handleAllowedPartyTypeChangeMock = jest.fn();
    const getPartyTypesAllowedOptionsMock = jest.fn(() => mockedPartyTypesAllowedOptions);
    render(
      <SelectAllowedPartyTypes
        {...defaultProps}
        handleAllowedPartyTypeChange={handleAllowedPartyTypeChangeMock}
        getPartyTypesAllowedOptions={getPartyTypesAllowedOptionsMock}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await waitFor(() => user.click(checkboxes[1]));

    expect(handleAllowedPartyTypeChangeMock).toHaveBeenCalledTimes(1);
  });
});
