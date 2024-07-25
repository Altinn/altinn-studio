import { textMock } from '@studio/testing/mocks/i18nMock';
import { SubPreviewMenuRightContent } from './AppPreviewBarConfig';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('AppPreviewBarConfig', () => {
  it('should render all buttons on right side', () => {
    render(<SubPreviewMenuRightContent />);

    expect(screen.getByRole('button', { name: textMock('preview.subheader.restart') }));
    expect(screen.getByRole('button', { name: textMock('preview.subheader.showas') }));
    expect(screen.getByRole('button', { name: textMock('preview.subheader.sharelink') }));
  });
});
