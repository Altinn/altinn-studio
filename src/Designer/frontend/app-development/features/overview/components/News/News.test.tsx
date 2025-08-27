import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { NewsList } from 'app-shared/types/api/NewsList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';

const mockNewsData = (newsList: NewsList) => {
  jest.mock('./NewsContent/news.nb.json', () => ({
    __esModule: true,
    default: newsList,
  }));
};

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
  afterEach(() => {
    jest.resetModules();
  });
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
    await renderNews(newsList);

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
    await renderNews(newsList);

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
    await renderNews(newsList);

    const noNewsTitle = screen.getByText(textMock('overview.no_news_title'));
    expect(noNewsTitle).toBeInTheDocument();
    const noNewsContent = screen.getByText(textMock('overview.no_news_content'));
    expect(noNewsContent).toBeInTheDocument();
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
    await renderNews(newsList);

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
    await renderNews(newsList);

    await waitFor(() => {
      screen.queryByText('News content');
    });

    const news = screen.queryByText('News content');
    expect(news).not.toBeInTheDocument();
  });
});

const renderNews = async (newsList: NewsList) => {
  mockNewsData(newsList);
  const { News } = await import('./News');
  return render(<News />);
};
