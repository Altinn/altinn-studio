import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentWithTagSummaryComponent } from 'src/layout/FileUploadWithTag/AttachmentWithTagSummaryComponent';
import { renderWithProviders } from 'src/testUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutCompFileUploadWithTag } from 'src/layout/FileUploadWithTag/types';
import type { RootState } from 'src/redux/store';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

describe('AttachmentWithTagSummaryComponent', () => {
  const attachmentName = 'attachment-name-1';
  const formLayoutItem: ExprUnresolved<ILayoutCompFileUploadWithTag> = {
    id: 'FileUploadWithTag',
    type: 'FileUploadWithTag',
    dataModelBindings: {},
    textResourceBindings: {},
    optionsId: 'a',
    mapping: { a: 'b' },
    maxFileSizeInMB: 15,
    displayMode: 'simple',
    maxNumberOfAttachments: 12,
    minNumberOfAttachments: 0,
  };
  const initialState = getInitialStateMock();
  const mockState = (formLayoutItem: ExprUnresolved<ILayoutCompFileUploadWithTag>): Pick<RootState, 'formLayout'> => ({
    formLayout: {
      layouts: {
        FormLayout: [formLayoutItem],
      },
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
      resources: [
        {
          id: 'a',
          value: 'the a',
        },
        {
          id: 'b',
          value: 'the b',
        },
        {
          id: 'c',
          value: 'the c',
        },
        {
          id: 'ba option value',
          value: 'the result',
        },
      ],
    },
    optionState: {
      error: null,
      options: {
        a: {
          id: 'a',
          options: [
            { value: 'a', label: 'aa option value' },
            { value: 'b', label: 'ab option value' },
            { value: 'c', label: 'ac option value' },
          ],
        },
        b: {
          id: 'a',
          options: [
            { value: 'a', label: 'ba option value' },
            { value: 'b', label: 'bb option value' },
            { value: 'c', label: 'bc option value' },
          ],
        },
        c: {
          id: 'a',
          options: [
            { value: 'a', label: 'ca option value' },
            { value: 'b', label: 'cb option value' },
            { value: 'c', label: 'cc option value' },
          ],
        },
        ['{"id":"a","mapping":{"a":"b"}}']: {
          id: 'a',
          options: [
            { value: 'a', label: 'da option value' },
            { value: 'b', label: 'db option value' },
            { value: 'c', label: 'dc option value' },
          ],
        },
      },
      loading: false,
    },
  };
  test('should render file upload with tag without content with the text Du har ikke lagt inn informasjon her', () => {
    renderHelper(formLayoutItem);
    const element = screen.getByTestId('attachment-with-tag-summary');
    expect(element).toHaveTextContent('Du har ikke lagt inn informasjon her');
  });
  test('should contain attachments', () => {
    renderHelper(formLayoutItem, extendedState);
    expect(screen.getByText(attachmentName)).toBeInTheDocument();
  });
  test('should render mapped option label', () => {
    renderHelper(formLayoutItem, extendedState);
    expect(screen.getByText('da option value')).toBeInTheDocument();
  });
  test('should render the text resource', () => {
    renderHelper({ ...formLayoutItem, optionsId: 'b', mapping: undefined }, extendedState);
    expect(screen.getByText('the result')).toBeInTheDocument();
  });
  test('should not render a text resource', () => {
    renderHelper({ ...formLayoutItem, optionsId: 'c', mapping: undefined }, extendedState);
    expect(screen.getByText('ca option value')).toBeInTheDocument();
  });

  const renderHelper = (options: ExprUnresolved<ILayoutCompFileUploadWithTag>, extendState?: Partial<RootState>) => {
    function Wrapper() {
      const node = useResolvedNode('FileUploadWithTag') as LayoutNodeFromType<'FileUploadWithTag'>;
      return <AttachmentWithTagSummaryComponent targetNode={node} />;
    }

    renderWithProviders(<Wrapper />, {
      preloadedState: {
        ...initialState,
        ...mockState(options),
        ...extendState,
      },
    });
  };
});
