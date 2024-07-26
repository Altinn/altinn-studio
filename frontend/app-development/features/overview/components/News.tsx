import * as React from 'react';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';
import { StudioPageError, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';

export const News = () => {
  const { data: newsList, isPending, isError } = useNewsListQuery();
  const { t } = useTranslation();
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];

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
        <StudioPageError
          title={t('overview.news_error_title')}
          message={t('overview.fetch_news_error_message')}
        />
      </NewsTemplate>
    );
  }

  return (
    <div>
      <NewsTemplate>
        {newsList.news?.map(({ title, content, date }) => {
          return (
            formattedToday >= date && (
              <div className={classes.newsContent} key={title}>
                <Heading level={3} size='xxsmall'>
                  {title}
                </Heading>
                <Paragraph size='small'>{content}</Paragraph>
              </div>
            )
          );
        })}
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
