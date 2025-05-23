import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditCorrespondenceResource } from './EditCorrespondenceResource';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('./useGetCorrespondenceResource', () => ({
  useGetCorrespondenceResource: jest.fn(),
}));

jest.mock('./useUpdateCorrespondenceResource', () => ({
  useUpdateCorrespondenceResource: jest.fn(),
}));

const mockUseGetCorrespondenceResource = require('./useGetCorrespondenceResource')
  .useGetCorrespondenceResource as jest.Mock;
const mockUseUpdateCorrespondenceResource = require('./useUpdateCorrespondenceResource')
  .useUpdateCorrespondenceResource as jest.Mock;

describe('EditCorrespondenceResource', (): void => {
  afterEach(() => jest.clearAllMocks());

  it('should render as button with content', (): void => {
    renderEditCorrespondenceResource();
    expect(getToggableTextFieldButton()).toBeEnabled();
  });

  it('should render with label, description and default value', async (): Promise<void> => {
    const user = userEvent.setup();
    mockUseGetCorrespondenceResource.mockReturnValue('default value');
    mockUseUpdateCorrespondenceResource.mockReturnValue(jest.fn());

    renderEditCorrespondenceResource();
    await user.click(getToggableTextFieldButton());

    expect(getToggableTextFieldByLabel()).toBeInTheDocument();
    expect(getToggableTextFieldDescription()).toBeInTheDocument();
    expect(screen.getByDisplayValue('default value')).toBeInTheDocument();
  });

  it('should call updateCorrespondenceResource on blur with the new value', async (): Promise<void> => {
    const user = userEvent.setup();
    const mockUpdate = jest.fn();
    mockUseGetCorrespondenceResource.mockReturnValue('initial value');
    mockUseUpdateCorrespondenceResource.mockReturnValue(mockUpdate);

    renderEditCorrespondenceResource();

    await user.click(getToggableTextFieldButton());
    const textField = getToggableTextFieldByLabel();

    await user.clear(textField);
    await user.type(textField, 'new correspondence');
    await user.tab();

    expect(mockUpdate).toHaveBeenCalledWith('new correspondence');
  });
});

function getToggableTextFieldButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: textMock('process_editor.configuration_panel.correspondence_resource'),
  });
}

function getToggableTextFieldByLabel(): HTMLInputElement {
  return screen.getByLabelText(
    textMock('process_editor.configuration_panel.correspondence_resource'),
  );
}

function getToggableTextFieldDescription(): HTMLElement {
  return screen.getByText(
    textMock('process_editor.configuration_panel.correspondence_resource_description'),
  );
}

function renderEditCorrespondenceResource(): void {
  render(<EditCorrespondenceResource />);
}
