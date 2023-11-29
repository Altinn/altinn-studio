import * as React from 'react';
import { Heading, Paragraph, Label, Alert } from '@digdir/design-system-react';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';
import { AltinnSpinner } from 'app-shared/components/AltinnSpinner';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';

export const News = () => {
  const { data: newsList, isLoading, isError } = useNewsListQuery();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <NewsTemplate>
        <AltinnSpinner spinnerText={t('administration.fetch_news_loading_message')} />
      </NewsTemplate>
    );
  }

  if (isError) {
    return (
      <NewsTemplate>
        <Alert severity='danger'>{t('administration.fetch_news_error_message')}</Alert>
      </NewsTemplate>
    );
  }

  return (
    <div>
      <NewsTemplate>
        {newsList.news?.map(({ title, content }) => (
          <div className={classes.newsContent} key={title}>
            <Label level={3} size='medium'>
              {title}
            </Label>
            <Paragraph size='small'>{content}</Paragraph>
          </div>
        ))}
      </NewsTemplate>
    </div>
  );
};

type NewsTemplateProps = {
  children: React.ReactNode;
};

const NewsTemplate = ({ children }: NewsTemplateProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Heading level={2} size='xxsmall' spacing>
        {t('administration.news_title')}
      </Heading>
      <div className={classes.news}>{children}</div>
    </>
  );
};
