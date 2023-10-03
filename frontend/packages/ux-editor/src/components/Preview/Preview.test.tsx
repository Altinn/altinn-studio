import React, { createRef } from 'react';
import { Preview } from './Preview';
import { screen } from '@testing-library/react';
import { queryClientMock, renderWithMockStore } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(previewIframeRef.current);
  });
});
