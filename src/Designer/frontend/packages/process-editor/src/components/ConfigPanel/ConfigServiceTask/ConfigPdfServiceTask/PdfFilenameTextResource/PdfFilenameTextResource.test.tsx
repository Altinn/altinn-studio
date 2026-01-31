import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfFilenameTextResource } from './PdfFilenameTextResource';
import { createPdfBpmnDetails, renderWithProviders } from '../testUtils';
import {
  updateModdlePropertiesMock,
  createMock,
} from '../../../../../../test/mocks/bpmnModelerMock';
import type { StudioTextResourceActionProps } from '@studio/components';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({
    data: {
      nb: [
        { id: 'existing-text-resource', value: 'Existing filename' },
        { id: 'another-resource', value: 'Another value' },
      ],
    },
  }),
}));

const mockUpsertTextResource = jest.fn();
jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: mockUpsertTextResource }),
}));

let capturedProps: StudioTextResourceActionProps | null = null;

jest.mock('@studio/components', () => {
  const actual = jest.requireActual('@studio/components');
  return {
    ...actual,
    StudioTextResourceAction: (props: StudioTextResourceActionProps) => {
      capturedProps = props;
      return <div data-testid='mock-text-resource-action'>MockStudioTextResourceAction</div>;
    },
  };
});

describe('PdfFilenameTextResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = null;
  });

  it('should render filename section with title', () => {
    renderPdfFilenameTextResource();

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_filename')),
    ).toBeInTheDocument();
  });

  it('should render filename description', () => {
    renderPdfFilenameTextResource();

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_pdf_filename_description')),
    ).toBeInTheDocument();
  });

  it('should render filename property button', () => {
    renderPdfFilenameTextResource();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });

  it('should display current filename value when text resource exists', () => {
    renderPdfFilenameTextResource('existing-text-resource');

    expect(screen.getByText('Existing filename')).toBeInTheDocument();
  });

  it('should display empty value when no filename text resource is set', () => {
    renderPdfFilenameTextResource();

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    expect(button).toBeInTheDocument();
  });

  it('should show StudioTextResourceAction when clicking filename button', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    expect(screen.getByTestId('mock-text-resource-action')).toBeInTheDocument();
  });

  it('should pass stored text resource id to StudioTextResourceAction', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource('existing-text-resource');

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    expect(capturedProps?.textResourceId).toBe('existing-text-resource');
  });

  it('should pass empty text resource id when no resource is stored', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    expect(capturedProps?.textResourceId).toBe('');
  });

  it('should update BPMN when handleIdChange is called', async () => {
    const user = userEvent.setup();
    createMock.mockImplementation((_, data) => data);
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    const newTextResourceId = 'new-text-resource-id';
    act(() => {
      capturedProps?.handleIdChange(newTextResourceId);
    });

    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        filenameTextResourceKey: expect.objectContaining({
          value: newTextResourceId,
        }),
      }),
    );
  });

  it('should upsert text resource when handleValueChange is called', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    capturedProps?.handleValueChange('some-id', 'Some new value');

    expect(mockUpsertTextResource).toHaveBeenCalledTimes(1);
    expect(mockUpsertTextResource).toHaveBeenCalledWith({
      textId: 'some-id',
      language: 'nb',
      translation: 'Some new value',
    });
  });

  it('should clear BPMN text resource key when handleRemoveTextResource is called', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource('existing-text-resource');

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    act(() => {
      capturedProps?.handleRemoveTextResource?.();
    });

    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        filenameTextResourceKey: null,
      }),
    );
  });

  it('should pass empty textResourceId after delete when reopening', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource('existing-text-resource');

    // Open editor
    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    expect(capturedProps?.textResourceId).toBe('existing-text-resource');

    // Simulate delete callback and closing (as StudioTextResourceAction does after delete)
    act(() => {
      capturedProps?.handleRemoveTextResource?.();
      capturedProps?.setIsOpen(false);
    });

    // Reopen editor
    const filenameButtonAfterDelete = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButtonAfterDelete);

    // After delete, textResourceId should be empty
    expect(capturedProps?.textResourceId).toBe('');
  });

  it('should provide a generateId function that returns valid id format', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    const generatedId = capturedProps?.generateId();
    expect(generatedId).toMatch(/^pdf-filename-/);
  });

  it('should close editor when setIsOpen is called with false', async () => {
    const user = userEvent.setup();
    renderPdfFilenameTextResource();

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    await user.click(filenameButton);

    expect(screen.getByTestId('mock-text-resource-action')).toBeInTheDocument();

    act(() => {
      capturedProps?.setIsOpen(false);
    });

    expect(screen.queryByTestId('mock-text-resource-action')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });
});

const renderPdfFilenameTextResource = (filenameTextResourceKey?: string) => {
  const bpmnDetails = createPdfBpmnDetails({ filenameTextResourceKey });

  return renderWithProviders(<PdfFilenameTextResource />, {
    bpmnContextProps: { bpmnDetails },
    bpmnApiContextProps: { layoutSets: { sets: [] } },
  });
};
