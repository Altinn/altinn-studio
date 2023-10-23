import { Heading, Paragraph, Label } from '@digdir/design-system-react';
import * as React from 'react';

import classes from './News.module.css';
// import { NewsList } from 'app-shared/types/api/NewsList';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';

export const News = () => {
  const { data: newsList, isLoading } = useNewsListQuery();
  if (isLoading) return null;
  return (
    <div>
      <Heading level={2} size='xxsmall' spacing>
        Nyheter
      </Heading>
      <div className={classes.news}>
        {newsList?.news?.map((news) => (
          <div className={classes.newsContent} key={news.title}>
            <Label level={3} size='small'>
              {news.title}
            </Label>
            <Paragraph size='xsmall'>{news.content}</Paragraph>
          </div>
        ))}
      </div>
    </div>
  );
};
