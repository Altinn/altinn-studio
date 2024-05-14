import React from 'react';
import { RedirectToCreatePageButton } from './RedirectToCreatePageButton';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

describe('RedirectToCreatePageButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('Navigates to "Lage" page when the button is clicked', () => {
    render(<RedirectToCreatePageButton />);

    const navigationButton = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel_custom_receipt_navigate_to_lage_button'),
    });
    expect(navigationButton).toHaveAttribute('href', '/editor/org/app/ui-editor');
  });
});
