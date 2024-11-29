import React from 'react';
import { render, screen } from '@testing-library/react';
import { SaveStatus, type SaveStatusProps } from './SaveStatus';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultProps: SaveStatusProps = {
  isPending: true,
  isSaved: true,
};

describe('SaveStatus', () => {
  it('should render pending status with spinner', () => {
    renderSaveStatus({
      componentProps: {
        isSaved: false,
      },
    });

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_save_scopes_pending')),
    ).toBeInTheDocument();

    expect(
      screen.getByTitle(textMock('settings_modal.maskinporten_tab_save_scopes_pending_spinner')),
    ).toBeInTheDocument();
  });

  it('should render saved status with checkmark icon', () => {
    renderSaveStatus({
      componentProps: {
        isPending: false,
      },
    });
    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_save_scopes_complete')),
    ).toBeInTheDocument();
  });

  it('should render nothing when neither pending nor saved', () => {
    const { container } = renderSaveStatus({
      componentProps: {
        isPending: false,
        isSaved: false,
      },
    });
    expect(container).toBeEmptyDOMElement();
  });
});

type Props = {
  componentProps: Partial<SaveStatusProps>;
};
const renderSaveStatus = (props: Partial<Props> = {}) => {
  return render(<SaveStatus {...defaultProps} {...props.componentProps} />);
};
