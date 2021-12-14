import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { altinnAppsIllustrationHelpCircleSvgUrl } from 'altinn-shared/utils';

interface IAltinnErrorClasses {
  root?: string;
  title?: string;
  content?: string;
}

export interface IAltinnErrorProps extends WithStyles<typeof styles> {
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

const styles = createStyles({
  contentMargin: {
    marginBottom: 24,
  },
  articleText: {
    fontSize: 18,
  },
  title: {
    fontWeight: AltinnAppTheme.sharedStyles.fontWeight.medium,
    color: AltinnAppTheme.altinnPalette.primary.blueDarker,
  },
  imageContainer: {
    marginTop: 65,
    marginLeft: 10,
  },
  gridContainer: {
    maxWidth: 750,
    '-ms-flex-wrap': 'nowrap',
  },
});

const AltinnError = (props: IAltinnErrorProps): JSX.Element => {
  const { classes, styling } = props;
  return (
    <Grid
      container={true}
      className={`${classes.gridContainer} ${styling ? styling.root : null}`}
    >
      <Grid item={true} md={8}>
        <div className={classes.contentMargin}>
          <Typography variant='caption'>{props.statusCode}</Typography>
        </div>
        <div className={classes.contentMargin}>
          <Typography
            variant='h1'
            className={classNames(
              classes.title,
              styling ? styling.title : null,
            )}
          >
            {props.title}
          </Typography>
        </div>
        <div className={classes.contentMargin}>
          <Typography
            classes={{ root: classes.articleText }}
            className={styling ? styling.content : null}
          >
            {props.content}
          </Typography>
        </div>
        <div>
          <Typography variant='body1'>
            <a href={props.url}>{props.urlText}</a>
          </Typography>
        </div>
        <div>
          <Typography variant='body1'>{props.urlTextSuffix}</Typography>
        </div>
      </Grid>
      <Grid item={true} md={4}>
        <div className={classes.imageContainer}>
          <img
            alt={props.imageAlt ? props.imageAlt : 'Altinn Help Illustration'}
            src={
              props.imageUrl
                ? props.imageUrl
                : altinnAppsIllustrationHelpCircleSvgUrl
            }
          />
        </div>
      </Grid>
    </Grid>
  );
};

export default withStyles(styles)(AltinnError);
