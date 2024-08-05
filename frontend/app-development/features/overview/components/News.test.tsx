import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME, NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';
import { News } from './News';
import type { NewsList } from 'app-shared/types/api/NewsList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToVisualText = (date: string) => {
  // Date comes in this format: YYYY-MM-DD
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
};

describe('News', () => {
  it('section title is always rendered', async () => {
    const publishDate = new Date();
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'content',
          date: formatDate(publishDate),
        },
      ],
    };
    await render(newsList);

    await screen.findByText('title');
  });
  it('content is rendered when available', async () => {
    const publishDate = new Date();
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: formatDate(publishDate),
        },
      ],
    };
    await render(newsList);

    await screen.findByText('title');
    await screen.findByText('News content');
    await screen.findByText(
      textMock('overview.news_date', { date: formatDateToVisualText(formatDate(publishDate)) }),
    );
  });

  it('placeholder is rendered when no relevant news are available', async () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - NEWS_EXPIRATION_TIME_IN_DAYS);
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: formatDate(publishDate),
        },
      ],
    };
    await render(newsList);
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('overview.fetch_news_loading_message')),
    );

    const noNewsTitle = screen.getByText(textMock('overview.no_news_title'));
    expect(noNewsTitle).toBeInTheDocument();
    const noNewsContent = screen.getByText(textMock('overview.no_news_content'));
    expect(noNewsContent).toBeInTheDocument();
  });

  it('loading spinner is shown while waiting for content', async () => {
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: '2021-01-01',
        },
      ],
    };
    render(newsList);

    await screen.findByText(textMock('overview.fetch_news_loading_message'));
  });

  it('does not list a news if the date in the news is in the future', async () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() + 1);
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: formatDate(publishDate),
        },
      ],
    };

    await render(newsList);

    await waitFor(() => {
      screen.queryByText('News content');
    });

    const news = screen.queryByText('News content');
    expect(news).not.toBeInTheDocument();
  });

  it('does not list a news if the publishDate is more than the expiration time in days ago', async () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - NEWS_EXPIRATION_TIME_IN_DAYS);
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: formatDate(publishDate),
        },
      ],
    };

    await render(newsList);

    await waitFor(() => {
      screen.queryByText('News content');
    });

    const news = screen.queryByText('News content');
    expect(news).not.toBeInTheDocument();
  });

  it('error message is shown when content fails to load', async () => {
    const publishDate = new Date();
    const newsList: NewsList = {
      news: [
        {
          title: 'title',
          content: 'News content',
          date: formatDate(publishDate),
        },
      ],
    };
    await render(newsList, {
      getNewsList: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await screen.findByText(textMock('overview.fetch_news_error_message'));
  });
});

const render = async (newsList: NewsList, queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders(<News />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    queries: {
      getNewsList: jest.fn().mockImplementation(() => Promise.resolve<NewsList>(newsList)),
      ...queries,
    },
  });
};
