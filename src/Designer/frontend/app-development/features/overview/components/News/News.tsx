import * as React from 'react';
import { Card, Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './News.module.css';
import { gitHubRoadMapUrl } from 'app-shared/ext-urls';
import newsData from './NewsContent/news.nb.json';
import { NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';

export const News = () => {
  const { t } = useTranslation();
  const today = new Date();

  const newsList = newsData.news;

  const showNews = (date: string): boolean => {
    const publishDate = new Date(date);
    const publishDatePlus30Days = new Date(publishDate);
    publishDatePlus30Days.setDate(publishDate.getDate() + NEWS_EXPIRATION_TIME_IN_DAYS);
    return publishDate <= today && today <= publishDatePlus30Days;
  };

  const thereAreRelevantNews = newsList.filter((news) => showNews(news.date)).length > 0;

  const formatDateToText = (date: string) => {
    // Date comes in this format: YYYY-MM-DD
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
  };

  return (
    <div>
      <NewsTemplate>
        {thereAreRelevantNews ? (
          newsList?.map(({ title, content, date }) => {
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
