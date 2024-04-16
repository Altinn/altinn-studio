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
  renderHookWithProviders,
  renderWithProviders,
} from '../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { FormItemContextProvider } from '../../FormItemContext';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';

const mockOrg = 'org';
const mockApp = 'app';
const mockSelectedLayoutSet = 'test-layout-set';

const mockPageName1 = layout1NameMock;
const mockPageName2 = layout2NameMock;

const mockReceiptName: string = 'Kvittering';

const mockPageData: IInternalLayout = {
  components: { component1Mock, component2Mock },
  containers: { mockContainerId: { id: 'id', itemType: 'CONTAINER', type: ComponentType.Group } },
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

const defaultProps: ReceiptContentProps = {
  receiptName: mockReceiptName,
  selectedAccordion: mockReceiptName,
  formLayoutData: mockFormLayoutData,
  onClickAccordion: mockOnClickAccordion,
};

describe('ReceiptContent', () => {
  afterEach(jest.clearAllMocks);

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
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithProviders(() =>
    useFormLayoutsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
  ).result;
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;

  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<ReceiptContentProps> = {}) => {
  await waitForData();
  return renderWithProviders(
    <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormItemContextProvider>
        <ReceiptContent {...defaultProps} {...props} />
      </FormItemContextProvider>
    </DragAndDrop.Provider>,
  );
};
