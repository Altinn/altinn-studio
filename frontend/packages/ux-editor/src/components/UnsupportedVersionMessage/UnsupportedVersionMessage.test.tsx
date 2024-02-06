import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnsupportedVersionMessageProps } from './UnsupportedVersionMessage';
import { UnsupportedVersionMessage } from './UnsupportedVersionMessage';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('UnsupportedVersionMessage', () => {
  it('should render without crashing', () => {
    const { baseElement } = renderUnsupportedVersionMessage();
    expect(baseElement).toBeTruthy();
  });

  it('should render the correct title', () => {
    renderUnsupportedVersionMessage();
    expect(
      screen.getByText(
        textMock('ux_editor.unsupported_version_message_title', { version: '2.0.0' }),
      ),
    ).toBeInTheDocument();
  });

  it('should correctly render body text for too-old category', () => {
    const category = 'too-old';
    const version = 'v1';
    const closestSupportedVersion = 'v2';
    renderUnsupportedVersionMessage({ category, version, closestSupportedVersion });
    expect(
      screen.getByText(
        textMock('ux_editor.unsupported_version_message.too_old_1', {
          version,
          closestSupportedVersion,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should correctly render body text for too-new category', () => {
    const category = 'too-new';
    const version = 'v4';
    const closestSupportedVersion = 'v3';
    renderUnsupportedVersionMessage({ category, version, closestSupportedVersion });
    expect(
      screen.getByText(
        textMock('ux_editor.unsupported_version_message.too_new_1', {
          version,
          closestSupportedVersion,
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('ux_editor.unsupported_version_message.too_new_2', {
          version,
          closestSupportedVersion,
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('ux_editor.unsupported_version_message.too_new_3', {
          version,
          closestSupportedVersion,
        }),
      ),
    ).toBeInTheDocument();
  });

  const renderUnsupportedVersionMessage = (props: Partial<UnsupportedVersionMessageProps> = {}) => {
    const defaultProps: UnsupportedVersionMessageProps = {
      version: '2.0.0',
      closestSupportedVersion: '1.0.0',
      category: 'too-old',
    };
    return render(<UnsupportedVersionMessage {...defaultProps} {...props} />);
  };
});
