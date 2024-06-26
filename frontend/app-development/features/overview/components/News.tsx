import * as React from 'react';
import { Heading, Paragraph, Alert } from '@digdir/design-system-react';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';

export const News = () => {
  const { data: newsList, isPending, isError } = useNewsListQuery();
  const { t } = useTranslation();

  if (isPending) {
    return (
      <NewsTemplate>
        <StudioSpinner showSpinnerTitle spinnerTitle={t('overview.fetch_news_loading_message')} />
      </NewsTemplate>
    );
  }

  if (isError) {
    return (
      <NewsTemplate>
        <Alert severity='danger'>{t('overview.fetch_news_error_message')}</Alert>
      </NewsTemplate>
    );
  }

  return (
    <div>
      <NewsTemplate>
        {newsList.news?.map(({ title, content }) => (
          <div className={classes.newsContent} key={title}>
            <Heading level={3} size='xxsmall'>
              {title}
            </Heading>
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
        {t('overview.news_title')}
      </Heading>
      <div className={classes.news}>{children}</div>
    </>
  );
};
