import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { ApiKeysList } from './ApiKeysList';
import type { ApiKey } from './ApiKeysList';

const activeKey: ApiKey = {
  id: 1,
  name: 'Deploy key',
  expiresAt: '2099-12-31T12:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  createdByUsername: 'testuser',
};

const expiredKey: ApiKey = {
  id: 2,
  name: 'Old key',
  expiresAt: '2020-01-01T00:00:00Z',
  createdAt: '2019-06-01T08:00:00Z',
  createdByUsername: null,
};

const olderKey: ApiKey = {
  id: 3,
  name: 'Older key',
  expiresAt: '2099-06-01T00:00:00Z',
  createdAt: '2023-01-01T00:00:00Z',
  createdByUsername: 'user2',
};

const onDelete = jest.fn();

type RenderProps = {
  apiKeys?: ApiKey[];
  isPending?: boolean;
  isError?: boolean;
  deletingId?: number;
  highlightId?: number;
  showCreatedBy?: boolean;
};

const renderApiKeysList = ({
  apiKeys = [],
  isPending = false,
  isError = false,
  deletingId,
  highlightId,
  showCreatedBy = false,
}: RenderProps = {}) =>
  renderWithProviders(
    <ApiKeysList
      apiKeys={apiKeys}
      isPending={isPending}
      isError={isError}
      onDelete={onDelete}
      deletingId={deletingId}
      highlightId={highlightId}
      showCreatedBy={showCreatedBy}
    />,
  );

describe('ApiKeysList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders a spinner while pending', () => {
    renderApiKeysList({ isPending: true });
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders an error message when isError is true', () => {
    renderApiKeysList({ isError: true });
    expect(screen.getByText(textMock('settings.api_keys.load_error'))).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderApiKeysList();
    expect(
      screen.getByRole('columnheader', { name: textMock('settings.api_keys.col_name') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: textMock('settings.api_keys.col_expires_at') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: textMock('settings.api_keys.col_created_at') }),
    ).toBeInTheDocument();
  });

  it('does not render the created-by column header when showCreatedBy is false', () => {
    renderApiKeysList();
    expect(
      screen.queryByRole('columnheader', { name: textMock('settings.api_keys.col_created_by') }),
    ).not.toBeInTheDocument();
  });

  it('renders the created-by column header when showCreatedBy is true', () => {
    renderApiKeysList({ showCreatedBy: true });
    expect(
      screen.getByRole('columnheader', { name: textMock('settings.api_keys.col_created_by') }),
    ).toBeInTheDocument();
  });

  it('renders key names in the table', () => {
    renderApiKeysList({ apiKeys: [activeKey, expiredKey] });
    expect(screen.getByText('Deploy key')).toBeInTheDocument();
    expect(screen.getByText('Old key')).toBeInTheDocument();
  });

  it('renders the formatted expiry date', () => {
    renderApiKeysList({ apiKeys: [activeKey] });
    expect(screen.getByText('31.12.2099')).toBeInTheDocument();
  });

  it('renders the formatted created date', () => {
    renderApiKeysList({ apiKeys: [activeKey] });
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('shows expired tag for expired keys', () => {
    renderApiKeysList({ apiKeys: [expiredKey] });
    expect(screen.getByText(textMock('settings.api_keys.expired'))).toBeInTheDocument();
  });

  it('does not show expired tag for active keys', () => {
    renderApiKeysList({ apiKeys: [activeKey] });
    expect(screen.queryByText(textMock('settings.api_keys.expired'))).not.toBeInTheDocument();
  });

  it('renders createdByUsername when showCreatedBy is true and value is present', () => {
    renderApiKeysList({ apiKeys: [activeKey], showCreatedBy: true });
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('renders em-dash when showCreatedBy is true and createdByUsername is null', () => {
    renderApiKeysList({ apiKeys: [expiredKey], showCreatedBy: true });
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('sorts keys by createdAt ascending', () => {
    renderApiKeysList({ apiKeys: [activeKey, olderKey] });
    const rows = screen.getAllByRole('row');
    const olderIndex = rows.findIndex((r) => r.textContent?.includes('Older key'));
    const activeIndex = rows.findIndex((r) => r.textContent?.includes('Deploy key'));
    expect(olderIndex).toBeLessThan(activeIndex);
  });

  it('calls onDelete when delete is confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const user = userEvent.setup();
    renderApiKeysList({ apiKeys: [activeKey] });
    await user.click(
      screen.getByRole('button', {
        name: textMock('settings.api_keys.delete', { name: activeKey.name }),
      }),
    );
    expect(onDelete).toHaveBeenCalledWith(activeKey.id);
  });

  it('disables the delete button for the key currently being deleted', () => {
    renderApiKeysList({ apiKeys: [activeKey, expiredKey], deletingId: activeKey.id });
    const deleteActive = screen.getByRole('button', {
      name: textMock('settings.api_keys.delete', { name: activeKey.name }),
    });
    const deleteExpired = screen.getByRole('button', {
      name: textMock('settings.api_keys.delete', { name: expiredKey.name }),
    });
    expect(deleteActive).toBeDisabled();
    expect(deleteExpired).not.toBeDisabled();
  });
});
