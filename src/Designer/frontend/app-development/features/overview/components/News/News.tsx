import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import classes from './News.module.css';
import { gitHubRoadMapUrl } from 'app-shared/ext-urls';
import newsData from './NewsContent/news.nb.json';
import { NEWS_EXPIRATION_TIME_IN_DAYS } from 'app-shared/constants';
import { StudioCard, StudioLink, StudioParagraph, StudioHeading } from '@studio/components';

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
                <StudioCard className={classes.newsContent} key={title}>
                  <StudioCard.Block>
                    <StudioHeading level={3} data-size='xs'>
                      {title}
                    </StudioHeading>
                    <StudioParagraph data-size='xs'>
                      {t('overview.news_date', { date: formatDateToText(date) })}
                    </StudioParagraph>
                    <StudioParagraph data-size='md'>
                      <Trans
                        i18nKey={content}
                        components={{
                          strong: <strong />,
                          br: <br />,
                        }}
                      />
                    </StudioParagraph>
                  </StudioCard.Block>
                </StudioCard>
              )
            );
          })
        ) : (
          <StudioCard variant='tinted' className={classes.noNews}>
            <StudioCard.Block>
              <StudioHeading level={3} data-size='xs'>
                {t('overview.no_news_title')}
              </StudioHeading>
            </StudioCard.Block>
            <StudioCard.Block>
              <StudioParagraph data-size='md'>
                <StudioLink href={gitHubRoadMapUrl} rel='noopener noreferrer' target='_newTab'>
                  {t('overview.no_news_content')}
                </StudioLink>
              </StudioParagraph>
            </StudioCard.Block>
          </StudioCard>
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
      <StudioHeading level={2} data-size='xs' spacing>
        {t('overview.news_title')}
      </StudioHeading>
      <div className={classes.news}>{children}</div>
    </>
  );
};
