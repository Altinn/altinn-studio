import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormComponentProps } from './FormComponent';
import { FormComponent } from './FormComponent';
import {
  renderHookWithMockStore,
  renderWithMockStore,
  textLanguagesMock,
} from '../../testing/mocks';
import { component1IdMock, component1Mock } from '../../testing/layoutMock';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { ITextResource } from 'app-shared/types/global';
import { useDeleteFormComponentMutation } from '../../hooks/mutations/useDeleteFormComponentMutation';
import type { UseMutationResult } from '@tanstack/react-query';
import type { IInternalLayout } from '../../types/global';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const testTextResourceKey = 'test-key';
const testTextResourceValue = 'test-value';
const emptyTextResourceKey = 'empty-key';
const testTextResource: ITextResource = { id: testTextResourceKey, value: testTextResourceValue };
const emptyTextResource: ITextResource = { id: emptyTextResourceKey, value: '' };
const nbTextResources: ITextResource[] = [testTextResource, emptyTextResource];
const handleEditMock = jest.fn().mockImplementation(() => Promise.resolve());
const handleSaveMock = jest.fn();
const debounceSaveMock = jest.fn();
const handleDiscardMock = jest.fn();

jest.mock('../../hooks/mutations/useDeleteFormComponentMutation');
const mockDeleteFormComponent = jest.fn();
const mockUseDeleteFormComponentMutation = useDeleteFormComponentMutation as jest.MockedFunction<
  typeof useDeleteFormComponentMutation
>;
mockUseDeleteFormComponentMutation.mockReturnValue({
  mutate: mockDeleteFormComponent,
} as unknown as UseMutationResult<IInternalLayout, Error, string, unknown>);

describe('FormComponent', () => {
  it('should render the component', async () => {
    await render();

    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeInTheDocument();
  });

  it('should edit the component when clicking on the component', async () => {
    await render();

    const component = screen.getByRole('listitem');
    await act(() => user.click(component));

    expect(handleSaveMock).toHaveBeenCalledTimes(1);
    expect(handleEditMock).toHaveBeenCalledTimes(1);
  });

  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('ux_editor.component_deletion_text'));
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: textMock('ux_editor.component_deletion_confirm'),
      });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', {
        name: textMock('ux_editor.component_deletion_confirm'),
      });
      await act(() => user.click(confirmButton));

      expect(mockDeleteFormComponent).toHaveBeenCalledWith(component1IdMock);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(mockDeleteFormComponent).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should call "handleDiscard" when "isEditMode: true"', async () => {
      await render({ isEditMode: true, handleDiscard: handleDiscardMock });

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', {
        name: textMock('ux_editor.component_deletion_confirm'),
      });
      await act(() => user.click(confirmButton));

      expect(mockDeleteFormComponent).toHaveBeenCalledTimes(1);
      expect(handleDiscardMock).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(mockDeleteFormComponent).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  describe('title', () => {
    it('should display the title', async () => {
      await render({
        component: {
          ...component1Mock,
          textResourceBindings: {
            title: testTextResourceKey,
          },
        },
      });

      expect(screen.getByText(testTextResourceValue)).toBeInTheDocument();
    });

    it('should display the component type when the title is empty', async () => {
      await render({
        component: {
          ...component1Mock,
          textResourceBindings: {
            title: emptyTextResourceKey,
          },
        },
      });

      expect(screen.getByRole('listitem')).toHaveTextContent(
        textMock('ux_editor.component_title.Input'),
      );
    });

    it('should display the component type when the title is undefined', async () => {
      await render({
        component: {
          ...component1Mock,
          textResourceBindings: {
            title: undefined,
          },
        },
      });

      expect(screen.getByRole('listitem')).toHaveTextContent(
        textMock('ux_editor.component_title.Input'),
      );
    });
  });

  describe('icon', () => {
    it('should display the icon', async () => {
      await render({
        component: {
          ...component1Mock,
          icon: 'Icon',
        },
      });

      expect(screen.getByTitle(textMock('ux_editor.component_title.Input'))).toBeInTheDocument();
    });
  });
});

const waitForData = async () => {
  const { result: texts } = renderHookWithMockStore(
    {},
    {
      getTextResources: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ language: 'nb', resources: nbTextResources })),
      getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
    },
  )(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(texts.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IFormComponentProps> = {}) => {
  const allProps: IFormComponentProps = {
    id: component1IdMock,
    isEditMode: false,
    component: component1Mock,
    handleEdit: handleEditMock,
    handleSave: handleSaveMock,
    debounceSave: debounceSaveMock,
    handleDiscard: handleDiscardMock,
    ...props,
  };

  await waitForData();

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormComponent {...allProps} />
    </DndProvider>,
  );
};
