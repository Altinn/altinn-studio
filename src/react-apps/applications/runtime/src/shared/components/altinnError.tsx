import {  createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { altinnAppsIllustrationHelpCircleSvgUrl } from '../../../../shared/src/utils/urlHelper';

export interface IAltinnErrorProps extends WithStyles<typeof styles>  {
  statusCode: string;
  title: string;
  content: string;
  url: string;
  urlText: string;
  urlTextSuffix: string;
  imageUrl?: string;
  imageAlt?: string;
}

const styles = createStyles({
  contentMargin: {
    marginBottom: 24,
  },
  articleText: {
    fontSize: 18,
  },
  imageContainer: {
    marginTop: 65,
    marginLeft: 10,
  },
  gridContainer: {
    maxWidth: 750,
  },
});

const AltinnError = (props: IAltinnErrorProps ): JSX.Element => {
  const { classes }  = props;
  return (
    <Grid container={true} className={classes.gridContainer}>
      <Grid item={true} md={8}>
        <div className={classes.contentMargin}>
          <Typography variant={'caption'}>
            {props.statusCode}
          </Typography>
        </div>
        <div className={classes.contentMargin}>
          <Typography variant={'h1'}>
            {props.title}
          </Typography>
        </div>
        <div className={classes.contentMargin}>
        <Typography classes={{root: classes.articleText}}>
            {props.content}
          </Typography>
        </div>
        <div>
          <Typography variant={'body1'}>
            <a href={props.url}>{props.urlText}</a>
          </Typography>
        </div>
        <div>
          <Typography variant={'body1'}>
              {props.urlTextSuffix}
          </Typography>
        </div>
      </Grid>
      <Grid item={true} md={4}>
        <div className={classes.imageContainer}>
          <img
            alt={props.imageAlt ? props.imageAlt : 'Altinn Help Illustration'}
            src={props.imageUrl ? props.imageUrl : altinnAppsIllustrationHelpCircleSvgUrl}
          />
        </div>
      </Grid>
    </Grid>
  );
};

export default withStyles(styles)(AltinnError);
