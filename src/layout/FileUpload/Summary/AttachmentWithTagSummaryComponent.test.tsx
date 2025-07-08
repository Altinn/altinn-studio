import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompFileUploadWithTagExternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const availableOptions = {
  'https://local.altinn.cloud/ttd/test/api/options/a?language=nb': {
    data: [
      { value: 'a', label: 'aa option value' },
      { value: 'b', label: 'ab option value' },
      { value: 'c', label: 'ac option value' },
    ],
    headers: {},
  },
  'https://local.altinn.cloud/ttd/test/api/options/b?language=nb': {
    data: [
      { value: 'a', label: 'ba option value' },
      { value: 'b', label: 'bb option value' },
      { value: 'c', label: 'bc option value' },
    ],
    headers: {},
  },
  'https://local.altinn.cloud/ttd/test/api/options/c?language=nb': {
    data: [
      { value: 'a', label: 'ca option value' },
      { value: 'b', label: 'cb option value' },
      { value: 'c', label: 'cc option value' },
    ],
    headers: {},
  },
  'https://local.altinn.cloud/ttd/test/api/options/d?language=nb': {
    data: [
      { value: 'a', label: 'da option value' },
      { value: 'b', label: 'db option value' },
      { value: 'c', label: 'dc option value' },
    ],
    headers: {},
  },
};

describe('AttachmentWithTagSummaryComponent', () => {
  const component: CompFileUploadWithTagExternal = {
    id: 'myComponent',
    type: 'FileUploadWithTag',
    textResourceBindings: {},
    optionsId: 'a',
    maxFileSizeInMB: 15,
    displayMode: 'list',
    maxNumberOfAttachments: 12,
    minNumberOfAttachments: 0,
  };
  test('should render file upload with tag without content with the text Du har ikke lagt inn informasjon her', async () => {
    await render({ component, addAttachment: false });
    const element = screen.getByTestId('attachment-with-tag-summary');
    expect(element).toHaveTextContent('Du har ikke lagt inn informasjon her');
  });
  test('should contain attachments', async () => {
    await render({ component });
    expect(await screen.findByText('attachment-name-1.pdf')).toBeInTheDocument();
  });
  test('should render mapped option label', async () => {
    await render({ component: { ...component, optionsId: 'd' } });
    expect(await screen.findByText('da option value')).toBeInTheDocument();
  });
  test('should render the text resource', async () => {
    await render({ component: { ...component, optionsId: 'b' } });
    expect(await screen.findByText('the result')).toBeInTheDocument();
  });
  test('should not render a text resource', async () => {
    await render({ component: { ...component, optionsId: 'c' } });
    expect(await screen.findByText('ca option value')).toBeInTheDocument();
  });
});

interface RenderProps {
  component: CompFileUploadWithTagExternal;
  addAttachment?: boolean;
}

const render = async ({ component, addAttachment = true }: RenderProps) => {
  const attachment: IData = {
    id: '123ab-456cd-789ef-012gh',
    dataType: 'myComponent',
    filename: 'attachment-name-1.pdf',
    size: 1200,
    tags: ['a', 'b', 'c'],
    instanceGuid: '123ab-456cd-789ef-012gh',
    refs: [],
    blobStoragePath: '',
    locked: false,
    contentType: 'application/pdf',
    lastChangedBy: 'test',
    lastChanged: '2021-09-08T12:00:00',
    createdBy: 'test',
    created: '2021-09-08T12:00:00',
  };

  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock((appMetadata) => {
      appMetadata.dataTypes.push({
        id: 'myComponent',
        allowedContentTypes: ['application/pdf'],
        maxCount: 4,
        minCount: 1,
      });
    }),
  );

  return await renderWithNode<true, LayoutNode<'FileUploadWithTag'>>({
    nodeId: 'myComponent',
    renderer: ({ node }) => (
      <AttachmentSummaryComponent
        targetBaseComponentId={node.baseId}
        changeText='whatever'
        onChangeClick={() => {
          throw new Error('Not implemented');
        }}
      />
    ),
    inInstance: true,
    queries: {
      fetchInstanceData: async () => ({
        ...getInstanceDataMock((i) => {
          addAttachment && i.data.push(attachment);
        }),
      }),
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [component],
          },
        },
      }),
      fetchOptions: (url) =>
        availableOptions[url]
          ? Promise.resolve(availableOptions[url])
          : Promise.reject(new Error(`No options available for ${url}`)),
      fetchTextResources: () =>
        Promise.resolve({
          language: 'nb',
          resources: [
            { id: 'a', value: 'the a' },
            { id: 'b', value: 'the b' },
            { id: 'c', value: 'the c' },
            { id: 'ba option value', value: 'the result' },
          ],
        }),
    },
  });
};
