import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { useAllOptionsInitiallyLoaded } from 'src/features/options/useAllOptions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { CompFileUploadWithTagExternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { RootState } from 'src/redux/store';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const availableOptions = {
  'https://local.altinn.cloud/ttd/test/api/options/a?language=nb&b=undefined': [
    { value: 'a', label: 'aa option value' },
    { value: 'b', label: 'ab option value' },
    { value: 'c', label: 'ac option value' },
  ],
  'https://local.altinn.cloud/ttd/test/api/options/b?language=nb': [
    { value: 'a', label: 'ba option value' },
    { value: 'b', label: 'bb option value' },
    { value: 'c', label: 'bc option value' },
  ],
  'https://local.altinn.cloud/ttd/test/api/options/c?language=nb': [
    { value: 'a', label: 'ca option value' },
    { value: 'b', label: 'cb option value' },
    { value: 'c', label: 'cc option value' },
  ],
  'https://local.altinn.cloud/ttd/test/api/options/d?language=nb&b=undefined': [
    { value: 'a', label: 'da option value' },
    { value: 'b', label: 'db option value' },
    { value: 'c', label: 'dc option value' },
  ],
};

describe('AttachmentWithTagSummaryComponent', () => {
  const attachmentName = 'attachment-name-1';
  const formLayoutItem: CompFileUploadWithTagExternal = {
    id: 'FileUploadWithTag',
    type: 'FileUploadWithTag',
    textResourceBindings: {},
    optionsId: 'a',
    mapping: { a: 'b' },
    maxFileSizeInMB: 15,
    displayMode: 'list',
    maxNumberOfAttachments: 12,
    minNumberOfAttachments: 0,
  };
  const initialState = getInitialStateMock();
  const mockState = (formLayoutItem: CompFileUploadWithTagExternal): Pick<RootState, 'formLayout'> => ({
    formLayout: {
      layouts: {
        FormLayout: [formLayoutItem],
      },
      layoutSetId: null,
      uiConfig: initialState.formLayout.uiConfig,
      layoutsets: initialState.formLayout.layoutsets,
      error: null,
    },
  });
  const extendedState: Partial<RootState> = {
    attachments: {
      attachments: {
        ['FileUploadWithTag']: [
          {
            name: attachmentName,
            id: 'attachment-id-1',
            uploaded: true,
            deleting: false,
            updating: false,
            size: 1200,
            tags: ['a', 'b', 'c'],
          },
        ],
      },
    },
    textResources: {
      language: 'nb',
      error: null,
      resourceMap: {
        a: {
          value: 'the a',
        },
        b: {
          value: 'the b',
        },
        c: {
          value: 'the c',
        },
        'ba option value': {
          value: 'the result',
        },
      },
    },
  };
  test('should render file upload with tag without content with the text Du har ikke lagt inn informasjon her', async () => {
    renderHelper(formLayoutItem);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    const element = screen.getByTestId('attachment-with-tag-summary');
    expect(element).toHaveTextContent('Du har ikke lagt inn informasjon her');
  });
  test('should contain attachments', async () => {
    renderHelper(formLayoutItem, extendedState);
    expect(await screen.findByText(attachmentName)).toBeInTheDocument();
  });
  test('should render mapped option label', async () => {
    renderHelper({ ...formLayoutItem, optionsId: 'd' }, extendedState);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('da option value')).toBeInTheDocument();
  });
  test('should render the text resource', async () => {
    renderHelper({ ...formLayoutItem, optionsId: 'b', mapping: undefined }, extendedState);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('the result')).toBeInTheDocument();
  });
  test('should not render a text resource', async () => {
    renderHelper({ ...formLayoutItem, optionsId: 'c', mapping: undefined }, extendedState);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('ca option value')).toBeInTheDocument();
  });

  const renderHelper = (component: CompFileUploadWithTagExternal, extendState?: Partial<RootState>) => {
    function Wrapper() {
      const node = useResolvedNode('FileUploadWithTag') as LayoutNode<'FileUploadWithTag'>;
      const allOptionsFetched = useAllOptionsInitiallyLoaded();
      const error = useAppSelector((state) => state.optionState.error);
      if (error) {
        throw error;
      }

      if (!allOptionsFetched) {
        return <div data-testid='loader'>Loading...</div>;
      }

      return <AttachmentSummaryComponent targetNode={node} />;
    }

    renderWithProviders(
      <Wrapper />,
      {
        preloadedState: {
          ...initialState,
          ...mockState(component),
          ...extendState,
        },
      },
      {
        fetchOptions: (url) =>
          availableOptions[url]
            ? Promise.resolve(availableOptions[url])
            : Promise.reject(new Error(`No options available for ${url}`)),
      },
    );
  };
});
