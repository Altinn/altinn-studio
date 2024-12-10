import React from 'react';
import { render, screen } from '@testing-library/react';
import { SaveStatus } from './SaveStatus';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('SaveStatus', () => {
  it('should display a spinner while pending', () => {
    render(<SaveStatus isPending isSaved={false} />);

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_save_scopes_pending')),
    ).toBeInTheDocument();

    expect(
      screen.getByTitle(textMock('settings_modal.maskinporten_tab_save_scopes_pending_spinner')),
    ).toBeInTheDocument();
  });

  it('should render saved status with checkmark icon', () => {
    render(<SaveStatus isPending={false} isSaved />);

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_save_scopes_complete')),
    ).toBeInTheDocument();
  });

  it('should render nothing when neither pending nor saved', () => {
    const { container } = render(<SaveStatus isPending={false} isSaved={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
