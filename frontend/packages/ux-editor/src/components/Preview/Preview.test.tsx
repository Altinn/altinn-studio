import React, { createRef } from 'react';
import { Preview } from './Preview';
import { act, screen } from '@testing-library/react';
import { queryClientMock, renderWithMockStore } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(previewIframeRef.current);
  });

  it('should be able to toggle between mobile and desktop view', async () => {
    const user = userEvent.setup();
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).not.toBeChecked();

    await act(() => user.click(switchButton));
    expect(switchButton).toBeChecked();
  });
});
