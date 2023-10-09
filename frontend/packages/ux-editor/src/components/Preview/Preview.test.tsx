import React, { createRef } from 'react';
import { Preview } from './Preview';
import { act, screen } from '@testing-library/react';
import { queryClientMock, renderWithMockStore } from '../../testing/mocks';
import type { IAppState } from '../../types/global';
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

  it('should render a message when no page is selected', () => {
    const mockedLayout = { layout: { selectedLayout: undefined } } as IAppState['formDesigner'];
    renderWithMockStore({ formDesigner: mockedLayout }, {}, queryClientMock)(<Preview />);
    expect(screen.getByText(textMock('ux_editor.no_page_selected'))).toBeInTheDocument();
  });
});
