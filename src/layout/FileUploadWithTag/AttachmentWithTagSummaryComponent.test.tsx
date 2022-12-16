import * as React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentWithTagSummaryComponent } from 'src/layout/FileUploadWithTag/AttachmentWithTagSummaryComponent';
import { renderWithProviders } from 'src/testUtils';
import type { ILayoutCompFileUploadWithTag } from 'src/layout/FileUploadWithTag/types';
import type { RootState } from 'src/store';

describe('AttachmentWithTagSummaryComponent', () => {
  const typeName = 'FileUploadWithTag';
  const attachmentName = 'attachment-name-1';
  const formLayoutItem = {
    id: typeName,
    type: typeName,
    dataModelBindings: {},
    textResourceBindings: {},
    optionsId: 'a',
    mapping: { a: 'b' },
  } as unknown as ILayoutCompFileUploadWithTag;
  const initialState = getInitialStateMock();
  const mockState = (formLayoutItem: ILayoutCompFileUploadWithTag): Pick<RootState, 'formLayout'> => ({
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
        [typeName]: [
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
    },
  };
  test('should render file upload with tag without content', () => {
    renderHelper(formLayoutItem);
    const element = screen.getByTestId('attachment-with-tag-summary');
    expect(element).toBeEmptyDOMElement();
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

  const renderHelper = (options: ILayoutCompFileUploadWithTag, extendState?: Partial<RootState>) => {
    renderWithProviders(
      <AttachmentWithTagSummaryComponent
        componentRef={typeName}
        component={options}
      />,
      {
        preloadedState: {
          ...initialState,
          ...mockState(options),
          ...extendState,
        },
      },
    );
  };
});
