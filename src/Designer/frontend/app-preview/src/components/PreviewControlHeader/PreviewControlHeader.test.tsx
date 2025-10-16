import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { PreviewControlHeader, type PreviewControlHeaderProps } from './PreviewControlHeader';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/mocks';
import { app, org } from '@studio/testing/testids';
import userEvent from '@testing-library/user-event';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { type QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Move
jest.mock('app-shared/hooks/queries');

// Move
export const mockLayoutId: string = 'layout1';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

const mockSetViewSize = jest.fn();
const mockHandleChangeLayoutSet = jest.fn();

export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';

export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'data-model',
      tasks: ['Task_1'],
    },
    {
      id: layoutSet2NameMock,
      dataType: 'data-model-2',
      tasks: ['Task_2'],
    },
  ],
};

const defaultProps: PreviewControlHeaderProps = {
  viewSize: 'desktop',
  setViewSize: mockSetViewSize,
  selectedLayoutSet: 'layoutSet1',
  handleChangeLayoutSet: mockHandleChangeLayoutSet,
};

describe('PreviewControlHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the spinner initially loading the component', () => {
    renderPreviewControlHeader();
    expect(screen.getByText(textMock('preview.loading_preview_controller'))).toBeInTheDocument();
  });

  it('should render the toggle buttons with the correct initial state', async () => {
    renderPreviewControlHeader();

    await waitForElementToBeRemoved(
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(
      screen.getByRole('radio', { name: textMock('preview.view_size_desktop') }),
    ).toBeChecked();
    expect(
      screen.getByRole('radio', { name: textMock('preview.view_size_mobile') }),
    ).not.toBeChecked();
  });

  it('should call setViewSize with "mobile" when the mobile button is clicked', async () => {
    const user = userEvent.setup();
    renderPreviewControlHeader();

    await waitForElementToBeRemoved(
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    const mobileButton = screen.getByRole('radio', { name: textMock('preview.view_size_mobile') });
    await user.click(mobileButton);

    expect(mockSetViewSize).toHaveBeenCalledWith('mobile');
  });

  it('should render the layout sets in the select dropdown', () => {
    const queryClient: QueryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
    renderPreviewControlHeader({ queryClient });

    const select = screen.getByRole('combobox');
    const options = screen.getAllByRole('option');

    expect(select).toHaveValue(layoutSetsMock.sets[0].id);
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent(layoutSetsMock.sets[0].id);
    expect(options[1]).toHaveTextContent(layoutSetsMock.sets[1].id);
  });

  it('should call handleChangeLayoutSet when a new layout set is selected', async () => {
    const user = userEvent.setup();

    const queryClient: QueryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
    renderPreviewControlHeader({ queryClient });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, layoutSetsMock.sets[1].id);

    expect(mockHandleChangeLayoutSet).toHaveBeenCalledWith(layoutSetsMock.sets[1].id);
    expect(mockHandleChangeLayoutSet).toHaveBeenCalledTimes(1);
  });

  it('should not render the layout sets dropdown if layoutSets is not available', () => {
    renderPreviewControlHeader();

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

type Props = {
  componentProps: Partial<PreviewControlHeaderProps>;
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
};

const renderPreviewControlHeader = (props: Partial<Props> = {}) => {
  const { componentProps, queries, queryClient } = props;

  return renderWithProviders(
    queries,
    queryClient,
  )(<PreviewControlHeader {...defaultProps} {...componentProps} />);
};
