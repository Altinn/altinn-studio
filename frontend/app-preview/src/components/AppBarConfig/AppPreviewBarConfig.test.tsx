import { RepositoryType } from 'app-shared/types/global';
import type { AppPreviewMenuItem } from './AppPreviewBarConfig';
import { mockUseTranslation, textMock } from '../../../../testing/mocks/i18nMock';
import { getTopBarAppPreviewMenu, menu } from './AppPreviewBarConfig';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SubPreviewMenuRightContent } from './AppPreviewBarConfig';

describe('getTopBarAppPreviewMenu', () => {
  const { t } = mockUseTranslation();
  it('should return all items when provided repository type is "App"', () => {
    expect(getTopBarAppPreviewMenu('test-org', 'test-app', RepositoryType.App, t)).toHaveLength(
      menu.length,
    );
  });

  it('should return empty list when provided repo type is "Unknown"', () => {
    const expected: AppPreviewMenuItem[] = [];
    expect(getTopBarAppPreviewMenu('test-org', 'test-app', RepositoryType.Unknown, t)).toEqual(
      expected,
    );
  });

  it('should render all buttons on right side', () => {
    render(<SubPreviewMenuRightContent />);

    expect(screen.getByRole('button', { name: textMock('preview.subheader.restart') }));
    expect(screen.getByRole('button', { name: textMock('preview.subheader.showas') }));
    expect(screen.getByRole('button', { name: textMock('preview.subheader.sharelink') }));
  });
});
