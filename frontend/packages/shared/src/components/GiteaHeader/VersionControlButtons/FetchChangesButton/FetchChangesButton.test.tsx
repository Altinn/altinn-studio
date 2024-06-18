import React from 'react';
import { FetchChanges, type FetchChangesProps } from './FetchChangesButton';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const mockHandleMergeConflict = jest.fn();

const mockGetRepoPull = jest.fn();

const defaultProps: FetchChangesProps = {
  hasMergeConflict: false,
  handleMergeConflict: mockHandleMergeConflict,
  displayNotification: false,
  numChanges: 0,
};

describe('fetchChanges', () => {
  afterEach(jest.clearAllMocks);

  it('should call "getPullRepo"" when clicking sync button', async () => {
    const user = userEvent.setup();

    const getRepoPull = mockGetRepoPull.mockImplementation(() => Promise.resolve({}));
    renderFetchChangesButton({ queries: { getRepoPull } });
    const syncButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(syncButton);
    expect(getRepoPull).toHaveBeenCalledTimes(1);
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesButton({
      componentProps: { displayNotification: true, numChanges: numberOfChanges },
    });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).toHaveTextContent(textMock('sync_header.fetch_changes') + numberOfChanges);
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesButton({
      componentProps: {
        displayNotification: true,
        numChanges: numberOfChanges,
        hasMergeConflict: true,
      },
    });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).not.toHaveTextContent(
      textMock('sync_header.fetch_changes') + numberOfChanges,
    );
  });

  it('should render fetch changes button as disabled when there are merge conflicts', () => {
    renderFetchChangesButton({ componentProps: { hasMergeConflict: true } });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).toHaveAttribute('disabled');
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
  componentProps: Partial<FetchChangesProps>;
};

const renderFetchChangesButton = (props: Partial<Props> = {}) => {
  const { queries, componentProps } = props;

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <FetchChanges {...defaultProps} {...componentProps} />
    </ServicesContextProvider>,
  );
};
