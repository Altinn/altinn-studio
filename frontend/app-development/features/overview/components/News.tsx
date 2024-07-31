import * as React from 'react';
import { Alert, Card, Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { useNewsListQuery } from 'app-development/hooks/queries/useNewsListQuery';
import { StudioPageError, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';
import { NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';
import { gitHubRoadMapUrl } from 'app-shared/ext-urls';

export const News = () => {
  const { data: newsList, isPending, isError, isSuccess } = useNewsListQuery();
  const { t } = useTranslation();
  const today = new Date();

  const showNews = (date: string): boolean => {
    const publishDate = new Date(date);
    const publishDatePlus30Days = new Date(publishDate);
    publishDatePlus30Days.setDate(publishDate.getDate() + NEWS_EXPIRATION_TIME_IN_DAYS);
    return publishDate <= today && today <= publishDatePlus30Days;
  };

  const thereAreRelevantNews =
    isSuccess && newsList.news.filter((news) => showNews(news.date)).length > 0;

  const formatDateToText = (date: string) => {
    // Date comes in this format: YYYY-MM-DD
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
  };

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
        {thereAreRelevantNews ? (
          newsList.news?.map(({ title, content, date }) => {
            return (
              showNews(date) && (
                <Card className={classes.newsContent} key={title}>
                  <Card.Header>
                    <Heading level={3} size='xxsmall'>
                      {title}
                    </Heading>
                  </Card.Header>
                  <Card.Content>
                    <Paragraph size='xsmall'>
                      {t('overview.news_date', { date: formatDateToText(date) })}
                    </Paragraph>
                  </Card.Content>
                  <Card.Content>
                    <Paragraph size='small'>{content}</Paragraph>
                  </Card.Content>
                </Card>
              )
            );
          })
        ) : (
          <Card color='subtle' className={classes.noNews}>
            <Card.Header>
              <Heading level={3} size='xxsmall'>
                {t('overview.no_news_title')}
              </Heading>
            </Card.Header>
            <Card.Content>
              <Paragraph size='small'>
                <Link href={gitHubRoadMapUrl} rel='noopener noreferrer' target='_newTab'>
                  {t('overview.no_news_content')}
                </Link>
              </Paragraph>
            </Card.Content>
          </Card>
        )}
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
