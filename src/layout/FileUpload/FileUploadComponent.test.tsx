import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';
import type { AxiosResponse } from 'axios';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderGenericComponentTest, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IGetAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternalExact, ILayoutCollection } from 'src/layout/layout';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

interface GetDataProps extends IGetAttachmentsMock {
  dataType: string;
}

function getDataElements(props: GetDataProps): IData[] {
  const { dataType, ...rest } = props;
  return getAttachmentsMock(rest).map((a) => ({ ...a.data, dataType, contentType: 'image/png' }));
}

describe('File uploading components', () => {
  describe('FileUploadComponent', () => {
    it('should show add attachment button and file counter when number of attachments is less than max', async () => {
      await render({
        component: { maxNumberOfAttachments: 3 },
        attachments: (dataType) => getDataElements({ count: 2, dataType }),
      });

      expect(screen.getByRole('button', { name: 'Legg til flere vedlegg' })).toBeInTheDocument();
      expect(screen.getByText(/Antall filer 2\/3\./i)).toBeInTheDocument();
    });

    it('should not show add attachment button, and should show file counter when number of attachments is same as max', async () => {
      await render({
        component: { maxNumberOfAttachments: 3 },
        attachments: (dataType) => getDataElements({ count: 3, dataType }),
      });

      expect(screen.queryByRole('button', { name: 'Legg til flere vedlegg' })).not.toBeInTheDocument();
      expect(screen.getByText(/Antall filer 3\/3\./i)).toBeInTheDocument();
    });

    describe('file status', () => {
      it('should show loading when file uploaded=false', async () => {
        const { mutations, id } = await render({ attachments: () => [] });
        const attachment = getDataElements({ count: 1, dataType: id })[0];
        expect(mutations.doAttachmentUploadOld.mock).not.toHaveBeenCalled();

        const file = new File(['(⌐□_□)'], attachment?.filename || '', { type: attachment.contentType });

        const fileInput = screen
          .getByRole('presentation', { name: /attachment-title/i })
          .querySelector('input') as HTMLInputElement;
        await userEvent.upload(fileInput, file);

        await waitFor(() => {
          expect(screen.getByText('Laster innhold')).toBeInTheDocument();
        });

        mutations.doAttachmentUploadOld.resolve(attachment);

        await waitFor(() => {
          expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
        });

        expect(mutations.doAttachmentUploadOld.mock).toHaveBeenCalledTimes(1);
      });

      it('should not show loading when file uploaded=true', async () => {
        await render({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });

        expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
      });

      it('should show loading when file deleting=true', async () => {
        const { mutations } = await render({
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: 'Slett vedlegg' })).toBeInTheDocument();
        });

        await deleteAttachment();

        await waitFor(() => {
          expect(screen.getByText('Laster innhold')).toBeInTheDocument();
        });

        mutations.doAttachmentRemove.resolve();

        await waitFor(() => {
          expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
        });

        expect(mutations.doAttachmentRemove.mock).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Slett vedlegg' })).not.toBeInTheDocument();
      });
    });

    describe('displayMode', () => {
      it('should not display drop area when displayMode is simple', async () => {
        await render({
          component: { displayMode: 'simple' },
          attachments: (dataType) => getDataElements({ count: 3, dataType }),
        });

        expect(screen.queryByRole('presentation', { name: /attachment-title/i })).not.toBeInTheDocument();
      });

      it('should display drop area when displayMode is not simple', async () => {
        await render({
          component: { displayMode: 'list', maxNumberOfAttachments: 5 },
          attachments: (dataType) => getDataElements({ count: 3, dataType }),
        });

        expect(screen.getByRole('presentation', { name: /attachment-title/i })).toBeInTheDocument();
      });

      it('should not display drop area when displayMode is not simple and max attachments is reached', async () => {
        await render({
          component: { displayMode: 'list', maxNumberOfAttachments: 3 },
          attachments: (dataType) => getDataElements({ count: 3, dataType }),
        });

        expect(screen.queryByRole('presentation', { name: /attachment-title/i })).not.toBeInTheDocument();
      });
    });

    it('an error should be displayed if two components are configured with the same binding', async () => {
      jest
        .spyOn(window, 'logError')
        .mockImplementation(() => {})
        .mockName('window.logError');
      jest
        .spyOn(window, 'logErrorOnce')
        .mockImplementation(() => {})
        .mockName('window.logErrorOnce');
      await renderWithInstanceAndLayout({
        renderer: () => <GenericComponentById id='FileUpload1' />,
        queries: {
          fetchLayouts: async (): Promise<ILayoutCollection> => ({
            page1: {
              data: {
                layout: [
                  {
                    id: 'FileUpload1',
                    type: 'FileUpload',
                    dataModelBindings: { list: { dataType: defaultDataTypeMock, field: 'test' } },
                    minNumberOfAttachments: 1,
                    maxNumberOfAttachments: 5,
                    maxFileSizeInMB: 2,
                    displayMode: 'list',
                  },
                  {
                    id: 'FileUpload2',
                    type: 'FileUpload',
                    dataModelBindings: { list: { dataType: defaultDataTypeMock, field: 'test' } },
                    minNumberOfAttachments: 1,
                    maxNumberOfAttachments: 5,
                    maxFileSizeInMB: 2,
                    displayMode: 'list',
                  },
                ],
              },
            },
          }),
        },
      });

      expect(
        screen.getByText(
          'Det er flere filopplastingskomponenter med samme datamodell-binding. Hver komponent må ha en unik binding. ' +
            "Andre komponenter med samme binding: 'FileUpload2'",
        ),
      ).toBeInTheDocument();
      jest.restoreAllMocks();
    });

    describe('Expression support for min/max attachments', () => {
      it('should work with static numbers (baseline test)', async () => {
        await render({
          component: {
            maxNumberOfAttachments: 2, // Static number (this should work)
            displayMode: 'list',
          },
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });

        // Should show the drop area since we have 1 attachment and max is 2
        expect(screen.getByRole('presentation', { name: /attachment-title/i })).toBeInTheDocument();
        expect(screen.getByText(/Antall filer 1\/2\./i)).toBeInTheDocument();
      });

      it('should evaluate conditional expression for maxNumberOfAttachments', async () => {
        await render({
          component: {
            maxNumberOfAttachments: ['if', ['equals', ['dataModel', 'user.type'], 'admin'], 10, 'else', 3], // Conditional expression
            displayMode: 'list',
          },
          attachments: (dataType) => getDataElements({ count: 2, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ user: { type: 'admin' } }),
          },
        });

        // Should show drop area since user is admin (max=10) and we only have 2 attachments
        expect(screen.getByRole('presentation', { name: /attachment-title/i })).toBeInTheDocument();
        expect(screen.getByText(/Antall filer 2\/10\./i)).toBeInTheDocument();
      });

      it('should evaluate conditional expression for non-admin user', async () => {
        await render({
          component: {
            maxNumberOfAttachments: ['if', ['equals', ['dataModel', 'user.type'], 'admin'], 10, 'else', 3], // Conditional expression
            displayMode: 'list',
          },
          attachments: (dataType) => getDataElements({ count: 3, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ user: { type: 'regular' } }),
          },
        });

        // Should not show drop area since user is regular (max=3) and we have 3 attachments
        expect(screen.queryByRole('presentation', { name: /attachment-title/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Antall filer 3\/3\./i)).toBeInTheDocument();
      });

      it('should evaluate dataModel expression for minNumberOfAttachments validation', async () => {
        await render({
          component: {
            minNumberOfAttachments: ['dataModel', 'form.requiredFiles'], // Expression using form data
            maxNumberOfAttachments: 5,
            displayMode: 'list',
            showValidations: ['Required'],
          },
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ form: { requiredFiles: 3 } }),
          },
        });

        // Should show validation error since expression resolves to 3 but we only have 1
        await waitFor(() => {
          expect(screen.getByText(/For å fortsette må du laste opp 3 vedlegg/i)).toBeInTheDocument();
        });
      });

      it('should evaluate complex expression with greaterThan for minNumberOfAttachments', async () => {
        await render({
          component: {
            minNumberOfAttachments: ['if', ['greaterThan', ['dataModel', 'form.priority'], 5], 2, 'else', 1], // Complex expression
            maxNumberOfAttachments: 5,
            displayMode: 'list',
            showValidations: ['Required'],
          },
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ form: { priority: 8 } }),
          },
        });

        // Should show validation error since priority > 5, so min=2 but we only have 1
        await waitFor(() => {
          expect(screen.getByText(/For å fortsette må du laste opp 2 vedlegg/i)).toBeInTheDocument();
        });
      });

      it('should handle expression that resolves to zero for minNumberOfAttachments', async () => {
        await render({
          component: {
            minNumberOfAttachments: ['dataModel', 'form.optionalFiles'], // Expression that resolves to 0
            maxNumberOfAttachments: 5,
            displayMode: 'list',
          },
          attachments: (dataType) => getDataElements({ count: 0, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ form: { optionalFiles: 0 } }),
          },
        });

        // Should not show validation error since expression resolves to 0
        expect(screen.queryByText(/For å fortsette må du laste opp/i)).not.toBeInTheDocument();
      });

      it('should use default values when expressions resolve to null/undefined', async () => {
        await render({
          component: {
            minNumberOfAttachments: ['dataModel', 'form.nonExistentMin'], // Expression that resolves to undefined
            maxNumberOfAttachments: ['dataModel', 'form.nonExistentMax'], // Expression that resolves to undefined
            displayMode: 'list',
          },
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
          queries: {
            fetchFormData: () => Promise.resolve({ form: {} }), // Empty form data
          },
        });

        // Should show drop area since default maxNumberOfAttachments is Infinity
        expect(screen.getByRole('presentation', { name: /attachment-title/i })).toBeInTheDocument();

        // Should not show min validation error since default minNumberOfAttachments is 0
        expect(screen.queryByText(/For å fortsette må du laste opp/i)).not.toBeInTheDocument();
      });
    });
  });

  async function openEdit() {
    await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));
  }

  async function deleteAttachment() {
    await userEvent.click(screen.getByRole('button', { name: 'Slett vedlegg' }));
  }

  async function selectTag(tagName: string = 'Tag 1') {
    await openEdit();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText(tagName));
    const saveButton = await waitFor(() => screen.findByRole('button', { name: 'Lagre' }));
    await userEvent.click(saveButton);
  }

  describe('FileUploadWithTagComponent', () => {
    describe('uploaded', () => {
      it('should show spinner when file status has uploaded=false', async () => {
        await renderWithTag({
          attachments: (dataType) => getDataElements({ count: 0, dataType }),
        });

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

        const dropZone = screen
          .getByRole('presentation', { name: /attachment-title/i })
          .querySelector('input') as HTMLInputElement;
        await userEvent.upload(dropZone, file);

        await screen.findByText('Laster innhold');
      });

      it('should not show spinner when file status has uploaded=true', async () => {
        await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
        expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
      });
    });

    describe('updating', () => {
      it('should show spinner in edit mode when file status has updating=true', async () => {
        const { mutations } = await renderWithTag({
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });
        await selectTag();

        expect(mutations.doAttachmentAddTag.mock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Laster innhold')).toBeInTheDocument();
        mutations.doAttachmentAddTag.resolve();

        await waitFor(() => expect(mutations.doAttachmentRemoveTag.mock).toHaveBeenCalledTimes(1));
        mutations.doAttachmentRemoveTag.resolve();

        await waitFor(() => {
          expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
        });
      });

      it('should not show spinner in edit mode when file status has updating=false', async () => {
        await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
        await openEdit();

        expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
      });
    });

    describe('editing', () => {
      it('should hide dropdown when updating', async () => {
        const { mutations } = await renderWithTag({
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });
        await selectTag();

        expect(mutations.doAttachmentAddTag.mock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Laster innhold')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      });

      it('should not disable dropdown in edit mode when not updating', async () => {
        await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
        await openEdit();

        expect(screen.getByRole('combobox')).not.toBeDisabled();
      });

      it('should not disable save button', async () => {
        await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
        await openEdit();

        expect(screen.getByRole('button', { name: 'Lagre' })).not.toBeDisabled();
      });

      it('should not allow opening for editing when readOnly=true', async () => {
        await renderWithTag({
          component: { readOnly: true },
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });
        expect(screen.queryByRole('button', { name: 'Rediger' })).not.toBeInTheDocument();
      });

      it('should not show save button when attachment.uploaded=false', async () => {
        const { mutations } = await renderWithTag({ attachments: () => [] });

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

        const dropZone = screen
          .getByRole('presentation', { name: /attachment-title/i })
          .querySelector('input') as HTMLInputElement;
        await userEvent.upload(dropZone, file);

        await waitFor(() => expect(mutations.doAttachmentUploadOld.mock).toHaveBeenCalledTimes(1));
        expect(screen.getByText('Laster innhold')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Lagre' })).not.toBeInTheDocument();
      });

      it('should not show save button when attachment.updating=true', async () => {
        const { mutations } = await renderWithTag({
          attachments: (dataType) => getDataElements({ count: 1, dataType }),
        });
        await selectTag();

        expect(mutations.doAttachmentAddTag.mock).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Lagre' })).not.toBeInTheDocument();
      });

      it('should automatically show attachments in edit mode for attachments without tags', async () => {
        await renderWithTag({
          attachments: (dataType) => {
            const out = getDataElements({ count: 1, dataType });
            out[0].tags = [];
            return out;
          },
        });

        expect(screen.getByRole('button', { name: 'Lagre' })).toBeInTheDocument();
      });

      it('should not automatically show attachments in edit mode for attachments with tags', async () => {
        await renderWithTag({
          attachments: (dataType) => {
            const out = getDataElements({ count: 1, dataType });
            out[0].tags = ['tag1'];
            return out;
          },
        });
        expect(screen.queryByRole('button', { name: 'Lagre' })).not.toBeInTheDocument();
      });
    });

    describe('files', () => {
      it('should display drop area when max attachments is not reached', async () => {
        await renderWithTag({
          component: { maxNumberOfAttachments: 3 },
          attachments: (dataType) => getDataElements({ count: 2, dataType }),
        });

        expect(screen.getByRole('presentation', { name: /attachment-title/i }).textContent).toMatch(
          'Dra og slipp eller let etter filTillatte filformater er: alle',
        );
      });

      it('should not display drop area when max attachments is reached', async () => {
        await renderWithTag({
          component: { maxNumberOfAttachments: 3 },
          attachments: (dataType) => getDataElements({ count: 3, dataType }),
        });

        expect(screen.queryByRole('presentation', { name: /attachment-title/i })).not.toBeInTheDocument();
      });
    });
  });

  type Types = 'FileUpload' | 'FileUploadWithTag';

  interface Props<T extends Types> extends Partial<RenderGenericComponentTestProps<T>> {
    type: T;
    attachments?: (dataType: string) => IData[];
  }

  async function renderAbstract<T extends Types>({
    type,
    component,
    attachments: attachmentsGenerator = (dataType) => getDataElements({ dataType }),
    queries,
  }: Props<T>) {
    jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
      getIncomingApplicationMetadataMock((a) => {
        a.dataTypes.push({
          id,
          allowedContentTypes: ['image/png'],
          maxCount: 4,
          minCount: 1,
        });
      }),
    );
    const id = uuidv4();
    const attachments = attachmentsGenerator(id);

    const textResourceBindings = {
      title: 'attachment-title',
      description: 'attachment-description',
    };

    const utils = await renderGenericComponentTest<T>({
      type,
      renderer: (props) => <FileUploadComponent {...props} />,
      component: {
        id,
        displayMode: type === 'FileUpload' ? 'simple' : 'list',
        maxFileSizeInMB: 2,
        maxNumberOfAttachments: type === 'FileUpload' ? 3 : 7,
        minNumberOfAttachments: 1,
        readOnly: false,
        textResourceBindings,
        ...(type === 'FileUploadWithTag' && {
          optionsId: 'test-options-id',
          textResourceBindings: {
            ...textResourceBindings,
            tagTitle: 'attachment-tag-title',
          },
        }),
        ...component,
      } as CompExternalExact<T>,
      queries: {
        fetchInstanceData: async () =>
          getInstanceDataMock((i) => {
            i.data.push(...attachments);
          }),
        fetchOptions: () =>
          Promise.resolve({
            data: [
              { value: 'tag1', label: 'Tag 1' },
              { value: 'tag2', label: 'Tag 2' },
              { value: 'tag3', label: 'Tag 3' },
            ],
            headers: {},
          } as AxiosResponse<IRawOption[], unknown>),
        ...queries,
      },
    });

    return { ...utils, id, attachments };
  }

  const render = (props: Omit<Props<'FileUpload'>, 'type'> = {}) => renderAbstract({ type: 'FileUpload', ...props });
  const renderWithTag = (props: Omit<Props<'FileUploadWithTag'>, 'type'> = {}) =>
    renderAbstract({ type: 'FileUploadWithTag', ...props });
});
