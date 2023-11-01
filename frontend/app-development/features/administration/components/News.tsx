import * as React from 'react';
import { Heading, Paragraph, Label, Alert } from '@digdir/design-system-react';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';
import { AltinnSpinner } from 'app-shared/components/AltinnSpinner';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';

export const News = () => {
  const { data: newsList, isLoading, isError } = useNewsListQuery();
  const { t } = useTranslation();
  return (
    <div>
      <Heading level={2} size='xxsmall' spacing>
        {t('administration.news_title')}
      </Heading>
      <div className={classes.news}>
        {isLoading && (
          <AltinnSpinner spinnerText={t('general.loading')} className={classes.spinner} />
        )}
        {isError && <Alert severity='danger'>{t('administration.fetch_news_error_message')}</Alert>}
        {!isLoading &&
          !isError &&
          newsList?.news?.map((news) => (
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
