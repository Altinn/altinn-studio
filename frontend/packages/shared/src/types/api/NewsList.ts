export interface NewsListItem {
  title: string;
  content: string;
  date: string;
}

export interface NewsList {
  news: NewsListItem[];
}
