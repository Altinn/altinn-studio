import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { ReceiptContentProps } from './ReceiptContent';
import { ReceiptContent } from './ReceiptContent';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormLayoutPage } from '../../../types/FormLayoutPage';
import {
  component1Mock,
  component2Mock,
  layout1NameMock,
  layout2NameMock,
} from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import type { IInternalLayout } from '../../../types/global';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { StudioDragAndDrop } from '@studio/components-legacy';
import { FormItemContextProvider } from '../../FormItemContext';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

const mockSelectedLayoutSet = layoutSet1NameMock;

const mockPageName1 = layout1NameMock;
const mockPageName2 = layout2NameMock;

const mockReceiptName: string = 'Kvittering';

const mockPageData: IInternalLayout = {
  components: { component1Mock, component2Mock },
  containers: { mockContainerId: { id: 'id', itemType: 'CONTAINER', type: ComponentTypeV3.Group } },
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
    await user.click(receiptButton);

    expect(mockOnClickAccordion).toHaveBeenCalledTimes(1);
  });

  it('calls "onClickAccordion" when another page is open and receipt it is clicked', async () => {
    const user = userEvent.setup();
    await render({ selectedAccordion: mockPageName1 });

    const receiptButton = screen.getByRole('button', { name: mockReceiptName });
    await user.click(receiptButton);

    expect(mockOnClickAccordion).toHaveBeenCalledTimes(1);
  });

  it('calls "onClickAddPage" when add page is clicked', async () => {
    const user = userEvent.setup();
    await render({ receiptName: undefined });

    const addButton = screen.getByRole('button', { name: textMock('receipt.create') });
    await user.click(addButton);

    expect(mockOnClickAddPage).toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(org, app, mockSelectedLayoutSet),
  ).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, mockSelectedLayoutSet)).renderHookResult.result;

  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<ReceiptContentProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(
    <StudioDragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormItemContextProvider>
        <ReceiptContent {...defaultProps} {...props} />
      </FormItemContextProvider>
    </StudioDragAndDrop.Provider>,
  );
};
