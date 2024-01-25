import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { ReceiptContentProps } from './ReceiptContent';
import { ReceiptContent } from './ReceiptContent';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { FormLayoutPage } from '../../../types/FormLayoutPage';
import {
  component1Mock,
  component2Mock,
  layout1NameMock,
  layout2NameMock,
} from '../../../testing/layoutMock';
import type { IInternalLayout } from '../../../types/global';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { FormContextProvider } from '../../FormContext';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

const mockOrg = 'org';
const mockApp = 'app';
const mockSelectedLayoutSet = 'test-layout-set';

const mockPageName1 = layout1NameMock;
const mockPageName2 = layout2NameMock;

const mockReceiptName: string = 'Kvittering';

const mockPageData: IInternalLayout = {
  components: { component1Mock, component2Mock },
  containers: { mockContainerId: { id: 'id', itemType: 'CONTAINER' } },
  customDataProperties: {},
  customRootProperties: {},
  order: { mockContainerId: [] },
};

const mockFormLayoutData: FormLayoutPage[] = [
  { page: mockPageName1, data: mockPageData },
  { page: mockPageName2, data: mockPageData },
  { page: mockReceiptName, data: mockPageData },
];

const mockOnClickAccordion = jest.fn();
const mockOnClickAddPage = jest.fn();

const defaultProps: ReceiptContentProps = {
  receiptName: mockReceiptName,
  selectedAccordion: mockReceiptName,
  formLayoutData: mockFormLayoutData,
  onClickAccordion: mockOnClickAccordion,
  onClickAddPage: mockOnClickAddPage,
};

describe('ReceiptContent', () => {
  afterEach(jest.clearAllMocks);

  it('displays button when receiptName is undefined', async () => {
    await render({ receiptName: undefined });

    const addButton = screen.getByRole('button', { name: textMock('receipt.create') });
    expect(addButton).toBeInTheDocument();

    const receiptAccordion = screen.queryByRole('button', { name: mockReceiptName });
    expect(receiptAccordion).not.toBeInTheDocument();
  });

  it('displays accordion when receiptName is present', async () => {
    await render();

    const addButton = screen.queryByRole('button', { name: textMock('receipt.create') });
    expect(addButton).not.toBeInTheDocument();

    const receiptAccordion = screen.getByRole('button', { name: mockReceiptName });
    expect(receiptAccordion).toBeInTheDocument();
  });

  it('calls "onClickAccordion" when receipt is open and the accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const receiptButton = screen.getByRole('button', { name: mockReceiptName });
    await act(() => user.click(receiptButton));

    expect(mockOnClickAccordion).toHaveBeenCalledTimes(1);
  });

  it('calls "onClickAccordion" when another page is open and receipt it is clicked', async () => {
    const user = userEvent.setup();
    await render({ selectedAccordion: mockPageName1 });

    const receiptButton = screen.getByRole('button', { name: mockReceiptName });
    await act(() => user.click(receiptButton));

    expect(mockOnClickAccordion).toHaveBeenCalledTimes(1);
  });

  it('calls "onClickAddPage" when add page is clicked', async () => {
    const user = userEvent.setup();
    await render({ receiptName: undefined });

    const addButton = screen.getByRole('button', { name: textMock('receipt.create') });
    await act(() => user.click(addButton));

    expect(mockOnClickAddPage).toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
  ).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet)).renderHookResult
    .result;

  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<ReceiptContentProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(
    <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormContextProvider>
        <ReceiptContent {...defaultProps} {...props} />
      </FormContextProvider>
    </DragAndDrop.Provider>,
  );
};
