import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { News } from './News';
import { NewsList } from 'app-shared/types/api/NewsList';

describe('News', () => {
  it('renders component', async () => {
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'content',
          date: '2021-01-01',
        },
      ],
    };
    await render(newsList);

    await screen.findByText('title');
    await screen.findByText('content');
  });
});

const render = async (newsList: NewsList) => {
  return renderWithProviders(<News />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    queries: {
      getNewsList: jest.fn().mockImplementation(() => Promise.resolve<NewsList>(newsList)),
    },
  });
};
