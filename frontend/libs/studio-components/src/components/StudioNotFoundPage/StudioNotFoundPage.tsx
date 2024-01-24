import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioNotFoundPage.module.css';
import cn from 'classnames';
import { Heading, Paragraph, Link } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';

type StudioNotFoundPageProps = HTMLAttributes<HTMLDivElement>;

/**
 * @component
 *    Displays the 404 - Not found page in studio
 */
export const StudioNotFoundPage = forwardRef<HTMLDivElement, StudioNotFoundPageProps>(
  ({ className, ...rest }, ref) => {
    const { t } = useTranslation();

    return (
      <div ref={ref} className={cn(className, classes.wrapper)} {...rest}>
        <div className={classes.contentWrapper}>
          <img src={require('./images/PCImage404.png')} alt='' />
          <div className={classes.textWrapper}>
            <Heading level={1} size='large'>
              {t('not_found_page.heading')}
            </Heading>
            <Paragraph size='small' className={classes.paragraph}>
              <Trans i18nKey='not_found_page.text'>
                <Link href='mailto:tjenesteeier@altinn.no'>tjenesteeier@altinn.no</Link>
              </Trans>
            </Paragraph>
            <Link href='/' size='small' className={classes.link}>
              {t('not_found_page.redirect_to_dashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  },
);

StudioNotFoundPage.displayName = 'StudioNotFoundPage';
