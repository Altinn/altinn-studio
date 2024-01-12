import React from 'react';

import cn from 'classnames';

import classes from 'src/components/altinnError.module.css';
import { altinnAppsIllustrationHelpCircleSvgUrl } from 'src/utils/urls/urlHelper';

export interface IAltinnErrorProps {
  statusCode: string | React.ReactNode;
  title: string | React.ReactNode;
  content: string | React.ReactNode;
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
      <span
        data-testid='StatusCode'
        className={cn(classes.statusCode, classes.contentMargin)}
      >
        {statusCode}
      </span>
      <h1 className={cn(classes.title, classes.contentMargin)}>{title}</h1>
      <p className={cn(classes.articleText, classes.contentMargin)}>{content}</p>
      <div>
        <a href={url}>{urlText}</a>
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
