import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FilenameTextResource } from './FilenameTextResource';
import type { StudioTextResourceActionProps } from '@studio/components';

vi.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

vi.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({
    data: {
      nb: [
        { id: 'existing-text-resource', value: 'Existing filename' },
        { id: 'another-resource', value: 'Another value' },
      ],
    },
  }),
}));

const mockUpsertTextResource = vi.fn();
vi.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: mockUpsertTextResource }),
}));

let capturedProps: StudioTextResourceActionProps | null = null;

vi.mock('@studio/components', async () => {
  const actual = await vi.importActual('@studio/components');
  return {
    ...actual,
    StudioTextResourceAction: (props: StudioTextResourceActionProps) => {
      capturedProps = props;
      return <div data-testid='mock-text-resource-action'>MockStudioTextResourceAction</div>;
    },
  };
});

const onTextResourceIdChange = vi.fn();
const filenameButtonName = textMock('process_editor.configuration_panel_pdf_filename_label');

describe('FilenameTextResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  it('shows the stored filename text', () => {
    renderFilenameTextResource({ textResourceId: 'existing-text-resource' });

    expect(screen.getByText('Existing filename')).toBeInTheDocument();
  });

  it('opens the editor with the stored text resource', async () => {
    const user = userEvent.setup();
    renderFilenameTextResource({ textResourceId: 'existing-text-resource' });

    await user.click(screen.getByRole('button', { name: filenameButtonName }));

    expect(screen.getByTestId('mock-text-resource-action')).toBeInTheDocument();
    expect(capturedProps?.textResourceId).toBe('existing-text-resource');
  });

  it('returns the selected text resource ID', async () => {
    const user = userEvent.setup();
    renderFilenameTextResource();

    await user.click(screen.getByRole('button', { name: filenameButtonName }));
    act(() => {
      capturedProps?.handleIdChange('new-text-resource-id');
    });

    expect(onTextResourceIdChange).toHaveBeenCalledWith('new-text-resource-id');
  });

  it('returns an empty ID when cleared and reopens with no selection', async () => {
    const user = userEvent.setup();
    renderFilenameTextResource({ textResourceId: 'existing-text-resource' });

    await user.click(screen.getByRole('button', { name: filenameButtonName }));
    act(() => {
      capturedProps?.handleRemoveTextResource?.();
      capturedProps?.setIsOpen(false);
    });
    await user.click(screen.getByRole('button', { name: filenameButtonName }));

    expect(onTextResourceIdChange).toHaveBeenCalledWith('');
    expect(capturedProps?.textResourceId).toBe('');
  });

  it('saves an edited filename as a text resource in the default language', async () => {
    const user = userEvent.setup();
    renderFilenameTextResource();

    await user.click(screen.getByRole('button', { name: filenameButtonName }));
    capturedProps?.handleValueChange('some-id', 'Some new value');

    expect(mockUpsertTextResource).toHaveBeenCalledWith({
      textId: 'some-id',
      language: 'nb',
      translation: 'Some new value',
    });
  });

  it('creates text resource IDs with the specified prefix', async () => {
    const user = userEvent.setup();
    renderFilenameTextResource({ textResourceIdPrefix: 'subform-pdf-filename' });

    await user.click(screen.getByRole('button', { name: filenameButtonName }));

    expect(capturedProps?.generateId()).toMatch(/^subform-pdf-filename-/);
  });
});

type RenderProps = {
  textResourceId?: string;
  textResourceIdPrefix?: string;
};

function FilenameTestHost({
  textResourceId: initialId = '',
  textResourceIdPrefix = 'pdf-filename',
}: RenderProps) {
  const [textResourceId, setTextResourceId] = useState(initialId);
  return (
    <FilenameTextResource
      textResourceId={textResourceId}
      onTextResourceIdChange={(id) => {
        onTextResourceIdChange(id);
        setTextResourceId(id);
      }}
      textResourceIdPrefix={textResourceIdPrefix}
    />
  );
}

const renderFilenameTextResource = (props: RenderProps = {}) =>
  render(<FilenameTestHost {...props} />);
