import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import classNames from 'classnames';

import { altinnAppsIllustrationHelpCircleSvgUrl } from 'altinn-shared/utils';

interface IAltinnErrorClasses {
  root?: string;
  title?: string;
  content?: string;
}

export interface IAltinnErrorProps {
  statusCode: string;
  title: string | React.ReactNode;
  content: string | React.ReactNode;
  url?: string;
  urlText?: string;
  urlTextSuffix?: string;
  imageUrl?: string;
  imageAlt?: string;
  styling?: IAltinnErrorClasses;
}

const useStyles = makeStyles((theme) => ({
  contentMargin: {
    marginBottom: 24,
  },
  articleText: {
    fontSize: 18,
  },
  title: {
    fontWeight: theme.sharedStyles.fontWeight.medium,
    color: theme.altinnPalette.primary.blueDarker,
  },
  imageContainer: {
    marginTop: 65,
    marginLeft: 10,
  },
  gridContainer: {
    maxWidth: 750,
    '-ms-flex-wrap': 'nowrap',
  },
}));

const AltinnError = ({
  styling,
  statusCode,
  title,
  content,
  url,
  urlText,
  urlTextSuffix,
  imageAlt,
  imageUrl,
}: IAltinnErrorProps) => {
  const classes = useStyles();

  return (
    <Grid
      data-testid='AltinnError'
      container={true}
      className={`${classes.gridContainer} ${styling ? styling.root : null}`}
    >
      <Grid
        item={true}
        md={8}
      >
        <div className={classes.contentMargin}>
          <Typography variant='caption'>{statusCode}</Typography>
        </div>
        <div className={classes.contentMargin}>
          <Typography
            variant='h1'
            className={classNames(
              classes.title,
              styling ? styling.title : null,
            )}
          >
            {title}
          </Typography>
        </div>
        <div className={classes.contentMargin}>
          <Typography
            classes={{ root: classes.articleText }}
            className={styling ? styling.content : null}
          >
            {content}
          </Typography>
        </div>
        <div>
          <Typography variant='body1'>
            <a href={url}>{urlText}</a>
          </Typography>
        </div>
        <div>
          <Typography variant='body1'>{urlTextSuffix}</Typography>
        </div>
      </Grid>
      <Grid
        item={true}
        md={4}
      >
        <div className={classes.imageContainer}>
          <img
            alt={imageAlt ? imageAlt : 'Altinn Help Illustration'}
            src={imageUrl ? imageUrl : altinnAppsIllustrationHelpCircleSvgUrl}
          />
        </div>
      </Grid>
    </Grid>
  );
};

export default AltinnError;
