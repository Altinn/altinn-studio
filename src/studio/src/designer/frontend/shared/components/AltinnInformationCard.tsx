import { createMuiTheme } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';
import AltinnIcon from './AltinnIcon';
import createInformationCardStyles from './styles/createInformationCardStyles';

export interface IAltinnInformationCardComponentProvidedProps {
  classes: any;
  headerTextKey: string;
  subtext1TextKey: string;
  subtext2TextKey: string;
  linkTextKey: string;
  urlKey: string;
  imageSource: string;
  language?: any;
  shadow: boolean;
}

export interface IAltinnInformationCardComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createInformationCardStyles(theme, {
  subText1: {
    paddingTop: 15,
    fontSize: 16,
  },
  subText2: {
    paddingBottom: 39,
  },
});

const AltinnInformationCard = (props: IAltinnInformationCardComponentProvidedProps) => {
  const { classes } = props;
  return (
    <Grid
      container={true}
      direction='column'
      className={classes.root}
      spacing={0}
      justify='center'
      alignContent='center'
    >
      <Grid
        container={true}
        item={true}
        spacing={0}
        justify='center'
        alignContent='center'
        className={classNames(classes.scrollable)}
      >

        <Grid
          className={classNames(classes.paper, { [classes.shadowBox]: props.shadow })}
          container={true}
          item={true}
        >
          <Grid container={true} item={true}>
            <Grid
              sm={12} md={7}
              item={true} container={true}
            >
              <Grid item={true}>
                <h1 className={classes.header}>
                  {getLanguageFromKey(props.headerTextKey, props.language)}
                </h1>
                <p className={classes.subText1}>
                  {getLanguageFromKey(props.subtext1TextKey, props.language)}
                </p>
                <p className={classes.subText2}>
                  {getLanguageFromKey(props.subtext2TextKey, props.language)}
                </p>
                <div className={classes.smSpacing}>
                  <a
                    href={getLanguageFromKey(props.urlKey, props.language)}
                    className={classes.link}
                  >
                    {getLanguageFromKey(props.linkTextKey, props.language)}
                    <AltinnIcon
                      isActive={true}
                      iconClass='fa fa-arrowrightup'
                      iconColor={theme.altinnPalette.primary.black}
                    />
                  </a>
                </div>
              </Grid>
            </Grid>
            <Grid
              container={true} sm={12}
              md={5} item={true}
              spacing={0} justify='center'
              alignContent='center'
            >
              <img alt='information' src={props.imageSource} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid >
  );
};

export default withStyles(styles)(AltinnInformationCard);
