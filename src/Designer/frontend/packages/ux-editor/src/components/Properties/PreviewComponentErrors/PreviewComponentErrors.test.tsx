import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';
import type { PreviewComponentErrors as Errors } from '../../Preview/studioBridge';
import { PreviewComponentErrors } from './PreviewComponentErrors';

describe('PreviewComponentErrors', () => {
  it('lists the errors that preview found in the component', () => {
    render(
      new Map([
        ['name', ['/readOnly: Must be boolean', "Field 'Model.missing' is not in the model"]],
      ]),
    );

    expect(
      screen.getByText(textMock('ux_editor.preview.component_has_errors')),
    ).toBeInTheDocument();
    expect(screen.getByText('/readOnly: Must be boolean')).toBeInTheDocument();
    expect(screen.getByText("Field 'Model.missing' is not in the model")).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.preview.component_errors_hidden')),
    ).toBeInTheDocument();
  });

  it('shows the errors as text', () => {
    render(new Map([['name', ['<img src=x onerror=alert(1)>']]]));

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('shows nothing when preview found no errors in the component', () => {
    render(new Map([['another-component', ['error']]]));

    expect(
      screen.queryByText(textMock('ux_editor.preview.component_has_errors')),
    ).not.toBeInTheDocument();
  });
});

const render = (previewComponentErrors: Errors) =>
  renderWithProviders(<PreviewComponentErrors componentId='name' />, {
    appContextProps: { previewComponentErrors },
  });
