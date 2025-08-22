import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { SubformMissingContentWarning } from './SubformMissingContentWarning';
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const setSelectedFormLayoutName = jest.fn();
const setSelectedFormLayoutSetName = jest.fn();
jest.mock('@altinn/ux-editor/hooks', () => ({
  useAppContext: () => ({
    setSelectedFormLayoutName,
    setSelectedFormLayoutSetName,
  }),
}));

describe('SubformMissingContentWarning', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SubformMissingContentWarning subformLayoutSetName='' />);
    expect(
      screen.getByText(
        textMock('ux_editor.component_properties.subform.layout_set_is_missing_content_heading'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('ux_editor.component_properties.subform.layout_set_is_missing_content_paragraph'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.navigate_to_subform_button'),
      }),
    ).toBeInTheDocument();
  });
  it('calls redirect/state change functions on redirect button click', async () => {
    const user = userEvent.setup();
    const subformLayoutSetName = 'test';
    renderWithProviders(
      <SubformMissingContentWarning subformLayoutSetName={subformLayoutSetName} />,
    );

    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.navigate_to_subform_button'),
      }),
    );

    expect(setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(setSelectedFormLayoutName).toHaveBeenCalledWith(undefined);
    expect(setSelectedFormLayoutSetName).toHaveBeenCalledTimes(1);
    expect(setSelectedFormLayoutSetName).toHaveBeenCalledWith(subformLayoutSetName);
  });
});
