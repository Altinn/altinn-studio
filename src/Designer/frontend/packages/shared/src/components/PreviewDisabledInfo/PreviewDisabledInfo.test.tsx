import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewDisabledInfo } from './PreviewDisabledInfo';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PreviewDisabledInfo', () => {
  it('Tells the user that preview is temporarily disabled', () => {
    render(<PreviewDisabledInfo />);
    expect(screen.getByText(textMock('preview.temporarily_disabled'))).toBeInTheDocument();
  });
});
