import { screen } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { ContactPoints } from './ContactPoints';
import type { ContactPoint } from 'app-shared/types/ContactPoint';
import { Route, Routes } from 'react-router-dom';

const RoutedContactPoints = () => (
  <Routes>
    <Route path=':owner/*' element={<ContactPoints />} />
  </Routes>
);

jest.mock('./components/PersonsList/PersonsList', () => ({
  PersonsList: ({ persons }: { persons: ContactPoint[] }) => (
    <div>PersonsList ({persons.length})</div>
  ),
}));

jest.mock('./components/SlackChannelsList/SlackChannelsList', () => ({
  SlackChannelsList: ({ channels }: { channels: ContactPoint[] }) => (
    <div>SlackChannelsList ({channels.length})</div>
  ),
}));

const testOrg = 'ttd';

const personContactPoint: ContactPoint = {
  id: 'person-1',
  name: 'Test',
  isActive: true,
  environments: [],
  methods: [{ id: 'method-1', methodType: 'email', value: 'test@example.com' }],
};

const slackContactPoint: ContactPoint = {
  id: 'slack-1',
  name: '#general',
  isActive: true,
  environments: [],
  methods: [{ id: 'method-2', methodType: 'slack', value: 'https://hooks.slack.com/test' }],
};

const renderContactPoints = (
  contactPoints?: ContactPoint[],
  initialEntries = ['/ttd/contact-points'],
) => {
  const queryClient = createQueryClientMock();
  if (contactPoints !== undefined) {
    queryClient.setQueryData([QueryKey.ContactPoints, testOrg], contactPoints);
  }
  return renderWithProviders(<RoutedContactPoints />, { queryClient, initialEntries });
};

describe('ContactPoints', () => {
  it('renders the loading spinner while data is pending', () => {
    renderContactPoints();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders the error message when query fails', async () => {
    const queryClient = createQueryClientMock();
    const getContactPoints = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithProviders(<RoutedContactPoints />, {
      queries: { getContactPoints },
      queryClient,
      initialEntries: ['/ttd/contact-points'],
    });
    await screen.findByText(textMock('settings.orgs.contact_points.error'));
    expect(screen.getByText(textMock('settings.orgs.contact_points.error'))).toBeInTheDocument();
  });

  it('renders the contact points heading when data is loaded', () => {
    renderContactPoints([]);
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.contact_points'),
      }),
    ).toBeInTheDocument();
  });

  it('passes only person contact points to PersonsList', () => {
    renderContactPoints([personContactPoint, slackContactPoint]);
    expect(screen.getByText('PersonsList (1)')).toBeInTheDocument();
  });

  it('passes only slack contact points to SlackChannelsList', () => {
    renderContactPoints([personContactPoint, slackContactPoint]);
    expect(screen.getByText('SlackChannelsList (1)')).toBeInTheDocument();
  });

  it('passes empty arrays when there are no contact points', () => {
    renderContactPoints([]);
    expect(screen.getByText('PersonsList (0)')).toBeInTheDocument();
    expect(screen.getByText('SlackChannelsList (0)')).toBeInTheDocument();
  });
});
