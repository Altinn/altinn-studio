import { render, screen } from '@testing-library/react';
import type { NewsList } from 'app-shared/types/api/NewsList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';
import { News } from './News';

let mockNewsList: NewsList = { news: [] };

jest.mock('./NewsContent/news.nb.json', () => ({
  __esModule: true,
  default: {
    get news() {
      return mockNewsList.news;
    },
  },
}));

const formatDate = (date: Date) => {
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

const newsListWithSingleNews = (date: Date, content: string = 'News content'): NewsList => ({
  news: [
    {
      title: 'title',
      content,
      date: formatDate(date),
    },
  ],
});

describe('News', () => {
  it('section title is always rendered', () => {
    renderNews(newsListWithSingleNews(new Date()));

    expect(
      screen.getByRole('heading', { name: textMock('overview.news_title'), level: 2 }),
    ).toBeInTheDocument();
  });

  it('content is rendered when available', () => {
    const publishDate = new Date();
    renderNews(newsListWithSingleNews(publishDate));

    expect(screen.getByRole('heading', { name: 'title', level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/News content/)).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('overview.news_date', { date: formatDateToVisualText(formatDate(publishDate)) }),
      ),
    ).toBeInTheDocument();
  });

  it('placeholder is rendered when no relevant news are available', () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - NEWS_EXPIRATION_TIME_IN_DAYS);
    renderNews(newsListWithSingleNews(publishDate));

    const noNewsTitle = screen.getByText(textMock('overview.no_news_title'));
    expect(noNewsTitle).toBeInTheDocument();
    const noNewsContent = screen.getByText(textMock('overview.no_news_content'));
    expect(noNewsContent).toBeInTheDocument();
  });

  it('does not list a news if the date in the news is in the future', () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() + 1);
    renderNews(newsListWithSingleNews(publishDate));

    const news = screen.queryByText('News content');
    expect(news).not.toBeInTheDocument();
  });

  it('does not list a news if the publishDate is more than the expiration time in days ago', () => {
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - NEWS_EXPIRATION_TIME_IN_DAYS - 1);
    renderNews(newsListWithSingleNews(publishDate));

    const news = screen.queryByText('News content');
    expect(news).not.toBeInTheDocument();
  });
});

const renderNews = (newsList: NewsList) => {
  mockNewsList = newsList;
  return render(<News />);
};
