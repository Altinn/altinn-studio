import {
  createStyles,
  Grid,
  Tab,
  Tabs,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import theme from '../../../../../shared/src/theme/altinnStudioTheme';
import AppReleaseActions from '../../../sharedResources/appRelease/appReleaseDispatcher';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import { IRelease } from '../../../sharedResources/appRelease/types';
import ReleaseComponent from '../components/appReleaseComponent';
import CreateReleaseComponent from '../components/createAppReleaseComponent';

const styles = createStyles({
  appReleaseWrapper: {
    background: 'white',
    borderLeft: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
});

interface IStyledTabsProps {
  value: number;
  onChange: (event: React.ChangeEvent<{}>, newValue: number) => void;
}

const StyledTabs = withStyles(createStyles({
  scroller: {
    maxHeight: '3.7rem',
  },
  indicator: {
    'display': 'flex',
    'justifyContent': 'center',
    'backgroundColor': 'transparent',
    'textTransform': 'none',
    'minHeight': 0,
    '& > div': {
      width: '70%',
      borderBottom: `2px solid ${theme.altinnPalette.primary.blue}`,
    },
  },
  flexContainer: {
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
}))((props: IStyledTabsProps) => <Tabs {...props} TabIndicatorProps={{ children: <div/> }}/>);

const StyledTab = withStyles(createStyles({
  root: {
    'minHeight': 0,
    'textTransform': 'none',
    'width': 'wrap',
    '&:focus': {
      outline: 0,
      color: theme.altinnPalette.primary.blue,
    },
    'paddingBottom': 0,
    'paddingLeft': '1.8rem',
    'paddingRight': '1.8rem',
    'minWidth': 0,
  },
  wrapper: {
    fontSize: '1.6rem',
  },
}))(Tab);

export interface IAppReleaseContainer extends WithStyles<typeof styles> { }

function AppReleaseContainer(props: IAppReleaseContainer) {
  const { classes } = props;

  const [tabIndex, setTabIndex] = React.useState(0);

  const appReleases: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);

  React.useEffect(() => {
    AppReleaseActions.getAppReleases();
  }, []);

  if (!appReleases.releases || !appReleases.releases.length) {
    return null;
  }

  function handleChangeTabIndex(event: React.ChangeEvent<{}>, value: number) {
    setTabIndex(value);
  }

  return (
    <Grid
      container={true}
      direction={'column'}
      className={classes.appReleaseWrapper}
      alignContent={'flex-end'}
    >
      <StyledTabs value={tabIndex} onChange={handleChangeTabIndex}>
        <StyledTab
          label={'Versjoner'}
        />
      </StyledTabs>
      <Grid
        container={true}
        direction={'column'}
      >
        <CreateReleaseComponent/>
        {appReleases.releases.map((release: IRelease, index: number) => (
          <ReleaseComponent key={index} release={release}/>
        ))}
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(AppReleaseContainer);
