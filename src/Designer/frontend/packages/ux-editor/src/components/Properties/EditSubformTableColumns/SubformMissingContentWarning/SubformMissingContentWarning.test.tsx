import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { SubformMissingContentWarning } from './SubformMissingContentWarning';
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('SubformMissingContentWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('calls navigate when redirect button is clicked', async () => {
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

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/testOrg/testApp/ui-editor/layoutSet/test');
  });
});
