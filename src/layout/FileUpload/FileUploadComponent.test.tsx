import React from 'react';

import { expect } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';
import type { jest } from '@jest/globals';
import type { AxiosResponse } from 'axios';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IGetAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternalExact } from 'src/layout/layout';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

interface GetDataProps extends IGetAttachmentsMock {
  dataType: string;
}

function getDataElements(props: GetDataProps): IData[] {
  const { dataType, ...rest } = props;
  return getAttachmentsMock(rest).map((a) => ({ ...a.data, dataType, contentType: 'image/png' }));
}

describe('FileUploadComponent', () => {
  it('should show add attachment button and file counter when number of attachments is less than max', async () => {
    await render({
      component: { maxNumberOfAttachments: 3 },
      attachments: (dataType) => getDataElements({ count: 2, dataType }),
    });

    expect(
      screen.getByRole('button', {
        name: 'Legg til flere vedlegg',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Antall filer 2\/3\./i)).toBeInTheDocument();
  });

  it('should not show add attachment button, and should show file counter when number of attachments is same as max', async () => {
    await render({
      component: { maxNumberOfAttachments: 3 },
      attachments: (dataType) => getDataElements({ count: 3, dataType }),
    });

    expect(
      screen.queryByRole('button', {
        name: 'Legg til flere vedlegg',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Antall filer 3\/3\./i)).toBeInTheDocument();
  });

  describe('file status', () => {
    it('should show loading when file uploaded=false', async () => {
      const { mutations, id } = await render({ attachments: () => [] });
      const attachment = getDataElements({ count: 1, dataType: id })[0];
      expect(mutations.doAttachmentUpload.mock).not.toHaveBeenCalled();

      const file = new File(['(⌐□_□)'], attachment?.filename || '', { type: attachment.contentType });

      const fileInput = screen.getByTestId(`altinn-drop-zone-${id}`).querySelector('input') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Laster innhold')).toBeInTheDocument();
      });

      mutations.doAttachmentUpload.resolve(attachment);

      await waitFor(() => {
        expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
      });

      expect(mutations.doAttachmentUpload.mock).toHaveBeenCalledTimes(1);
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
        expect(screen.getByRole('button', { name: 'Slett' })).toBeInTheDocument();
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
      expect(screen.queryByRole('button', { name: 'Slett' })).not.toBeInTheDocument();
    });
  });

  describe('displayMode', () => {
    it('should not display drop area when displayMode is simple', async () => {
      const { id } = await render({
        component: { displayMode: 'simple' },
        attachments: (dataType) => getDataElements({ count: 3, dataType }),
      });

      expect(screen.queryByTestId(`altinn-drop-zone-${id}`)).not.toBeInTheDocument();
    });

    it('should display drop area when displayMode is not simple', async () => {
      const { id } = await render({
        component: { displayMode: 'list', maxNumberOfAttachments: 5 },
        attachments: (dataType) => getDataElements({ count: 3, dataType }),
      });

      expect(screen.getByTestId(`altinn-drop-zone-${id}`)).toBeInTheDocument();
    });

    it('should not display drop area when displayMode is not simple and max attachments is reached', async () => {
      const { id } = await render({
        component: { displayMode: 'list', maxNumberOfAttachments: 3 },
        attachments: (dataType) => getDataElements({ count: 3, dataType }),
      });

      expect(screen.queryByTestId(`altinn-drop-zone-${id}`)).not.toBeInTheDocument();
    });
  });
});

async function openEdit() {
  await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));
}

async function deleteAttachment() {
  await userEvent.click(screen.getByRole('button', { name: 'Slett' }));
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
      const { id } = await renderWithTag({
        attachments: (dataType) => getDataElements({ count: 0, dataType }),
      });

      const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

      const dropZone = screen.getByTestId(`altinn-drop-zone-${id}`).querySelector('input') as HTMLInputElement;
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
      const { mutations } = await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
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
      const { mutations } = await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
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

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeDisabled();
    });

    it('should not allow opening for editing when readOnly=true', async () => {
      await renderWithTag({
        component: { readOnly: true },
        attachments: (dataType) => getDataElements({ count: 1, dataType }),
      });
      expect(screen.queryByRole('button', { name: 'Rediger' })).not.toBeInTheDocument();
    });

    it('should not show save button when attachment.uploaded=false', async () => {
      const { id, mutations } = await renderWithTag({ attachments: () => [] });

      const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

      const dropZone = screen.getByTestId(`altinn-drop-zone-${id}`).querySelector('input') as HTMLInputElement;
      await userEvent.upload(dropZone, file);

      await waitFor(() => expect(mutations.doAttachmentUpload.mock).toHaveBeenCalledTimes(1));
      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Lagre' })).not.toBeInTheDocument();
    });

    it('should not show save button when attachment.updating=true', async () => {
      const { mutations } = await renderWithTag({ attachments: (dataType) => getDataElements({ count: 1, dataType }) });
      await selectTag();

      expect(mutations.doAttachmentAddTag.mock).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });

    it('should automatically show attachments in edit mode for attachments without tags', async () => {
      await renderWithTag({
        attachments: (dataType) => {
          const out = getDataElements({ count: 1, dataType });
          out[0].tags = [];
          return out;
        },
      });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeInTheDocument();
    });

    it('should not automatically show attachments in edit mode for attachments with tags', async () => {
      await renderWithTag({
        attachments: (dataType) => {
          const out = getDataElements({ count: 1, dataType });
          out[0].tags = ['tag1'];
          return out;
        },
      });
      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('files', () => {
    it('should display drop area when max attachments is not reached', async () => {
      const { id } = await renderWithTag({
        component: { maxNumberOfAttachments: 3 },
        attachments: (dataType) => getDataElements({ count: 2, dataType }),
      });

      expect(screen.getByTestId(`altinn-drop-zone-${id}`).textContent).toMatch(
        'Dra og slipp eller let etter filTillatte filformater er: alle',
      );
    });

    it('should not display drop area when max attachments is reached', async () => {
      await renderWithTag({
        component: { maxNumberOfAttachments: 3 },
        attachments: (dataType) => getDataElements({ count: 3, dataType }),
      });

      expect(
        screen.queryByRole('presentation', {
          name: 'Dra og slipp eller let etter fil Tillatte filformater er: alle',
        }),
      ).not.toBeInTheDocument();
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
}: Props<T>) {
  (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementationOnce(() =>
    Promise.resolve(
      getIncomingApplicationMetadataMock((a) => {
        a.dataTypes.push({
          id,
          allowedContentTypes: ['image/png'],
          maxCount: 4,
          minCount: 1,
        });
      }),
    ),
  );
  const id = uuidv4();
  const attachments = attachmentsGenerator(id);

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
      ...(type === 'FileUploadWithTag' && {
        optionsId: 'test-options-id',
        textResourceBindings: {
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
    },
  });

  return { ...utils, id, attachments };
}

const render = (props: Omit<Props<'FileUpload'>, 'type'> = {}) => renderAbstract({ type: 'FileUpload', ...props });
const renderWithTag = (props: Omit<Props<'FileUploadWithTag'>, 'type'> = {}) =>
  renderAbstract({ type: 'FileUploadWithTag', ...props });
