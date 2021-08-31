import { Grid, Typography, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { IRuntimeState } from 'src/types';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { AltinnAppTheme } from 'altinn-shared/theme';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { withStyles } from '@material-ui/core/styles';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordion from '@material-ui/core/Accordion';
import AccountBoxIcon from '@material-ui/icons/AccountBox';
import AccessibilityNewIcon from '@material-ui/icons/AccessibilityNew';
import AssessmentIcon from '@material-ui/icons/Assessment';
import DesktopWindowsIcon from '@material-ui/icons/DesktopWindows';
import FaceIcon from '@material-ui/icons/Face';
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';
import MapIcon from '@material-ui/icons/Map';
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon';
import ApartmentIcon from '@material-ui/icons/Apartment';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import InfoIcon from '@material-ui/icons/Info';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';

export interface IDisplayAccordionContainer {
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  // eslint-disable-next-line no-undef
  renderLayoutComponent: (components: ILayoutComponent | ILayoutGroup, layout: ILayout) => JSX.Element;
  iconLabel?: string;
}

const useStyles = makeStyles({
  root: {
    width: '120%',
    padding: 12,
  },
  groupTitle: {
    fontWeight: 500,
    fontSize: '2rem',
  },
  accordionBody: {
    padding: 30,
    paddingBottom: 40,
    display: 'grid',
    '& .MuiGrid-item': {
      marginTop: '0.2em',
    },
  },
  spacing: {
    spacing: 0,
    justifyContent: 'start',
    gridGap: '12px 24px',
  },
  icon: {
    flexBasis: '10%',
    flexShrink: 0,
  },
  hover: {
    '&:hover': {
      backgroundColor: AltinnAppTheme.altinnPalette.primary.greyLight,
    },
  },
  hoverError: {
    '&:hover': {
      backgroundColor: AltinnAppTheme.altinnPalette.primary.redLight,
    },
  },
});

const AccordionSummary = withStyles((theme) => ({
  root: {
    boxShadow: theme.shadows[1],
  },
}))(MuiAccordionSummary);

const Accordion = withStyles((theme) => ({
  root: {
    [theme.breakpoints.up('md')]: {
      '&$expanded': {
        margin: '0 -3.5%',
      },
    },
  },
  expanded: {},
}))(MuiAccordion);

export function DisplayAccordionContainer(props: IDisplayAccordionContainer) {
  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, { id: props.container.id }));
  const classes = useStyles();
  const title = useSelector((state: IRuntimeState) => {
    const titleKey = props.container.textResourceBindings?.title;
    if (titleKey) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);
  const hasErrors = true;

  const setIcon = (label: string) => {
    // if edit button has been clicked while edit container is open, we trigger validations if present in triggers
    let component;
    switch (label) {
      case 'account-box':
        component = <AccountBoxIcon fontSize='large'>star</AccountBoxIcon>;
        break;
      case 'person-figure':
        component = <AccessibilityNewIcon fontSize='large'>star</AccessibilityNewIcon>;
        break;
      case 'bar-chart':
        component = <AssessmentIcon fontSize='large'>star</AssessmentIcon>;
        break;
      case 'desktop':
        component = <DesktopWindowsIcon fontSize='large'>star</DesktopWindowsIcon>;
        break;
      case 'face':
        component = <FaceIcon fontSize='large'>star</FaceIcon>;
        break;
      case 'heart':
        component = <FavoriteBorderIcon fontSize='large'>star</FavoriteBorderIcon>;
        break;
      case 'map':
        component = <MapIcon fontSize='large'>star</MapIcon>;
        break;
      case 'smile-emoji':
        component = <InsertEmoticonIcon fontSize='large'>star</InsertEmoticonIcon>;
        break;
      case 'apartment':
        component = <ApartmentIcon fontSize='large'>star</ApartmentIcon>;
        break;
      case 'time':
        component = <AccessTimeIcon fontSize='large'>star</AccessTimeIcon>;
        break;
      case 'info':
        component = <InfoIcon fontSize='large'>star</InfoIcon>;
        break;
      default:
        component = <AccountBoxIcon fontSize='large'>star</AccountBoxIcon>;
        break;
    }
    return component;
  };

  if (hidden) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      id={props.container.id}
      spacing={3}
      alignItems='flex-start'
    >
      <div className={classes.root}>
        <Accordion
          square={true}
          className={hasErrors ? 'validation-error accordionError' : ''}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className={hasErrors ? classes.hoverError : classes.hover}
          >
            <Typography className={classes.icon}>
              {setIcon(props.iconLabel)}
            </Typography>
            <Typography className={classes.groupTitle} variant='body1'>
              {title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionBody}>
            <Grid
              className={classes.spacing}
              item={true}
              container={true}
              xs={12}
            >
              {props.components.map((component) => {
                return props.renderLayoutComponent(component, layout);
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </div>
    </Grid>
  );
}
