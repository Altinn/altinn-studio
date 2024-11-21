import React from 'react';

import cn from 'classnames';

import classes from 'src/components/altinnError.module.css';
import { Lang } from 'src/features/language/Lang';
import { altinnAppsIllustrationHelpCircleSvgUrl } from 'src/utils/urls/urlHelper';

export interface IAltinnErrorProps {
  statusCode?: string | React.ReactNode;
  title: string | React.ReactNode;
  content: string | React.ReactNode;
  showContactInfo?: boolean;
  url?: string;
  urlText?: string;
  urlTextSuffix?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export const AltinnError = ({
  statusCode,
  title,
  content,
  showContactInfo,
  url,
  urlText,
  urlTextSuffix,
  imageAlt,
  imageUrl,
}: IAltinnErrorProps) => (
  <div
    data-testid='AltinnError'
    className={classes.flexContainer}
  >
    <div className={classes.contentContainer}>
      {statusCode && (
        <span
          data-testid='StatusCode'
          className={cn(classes.statusCode, classes.contentMargin)}
        >
          {statusCode}
        </span>
      )}
      <h1 className={cn(classes.title, classes.contentMargin)}>{title}</h1>
      <p className={cn(classes.articleText, classes.contentMargin)}>{content}</p>
      {showContactInfo && (
        <p>
          <Lang
            id='instantiate.forbidden_action_error_customer_support'
            params={[
              <Lang
                key='0'
                id='general.customer_service_phone_number'
              />,
            ]}
          />
        </p>
      )}
      <div>
        <a
          className='altinnLink'
          href={url}
        >
          {urlText}
        </a>
      </div>
      <div>
        <span>{urlTextSuffix}</span>
      </div>
    </div>
    <div className={classes.imageContainer}>
      <img
        alt={imageAlt || 'Altinn Help Illustration'}
        src={imageUrl || altinnAppsIllustrationHelpCircleSvgUrl}
      />
    </div>
  </div>
);
