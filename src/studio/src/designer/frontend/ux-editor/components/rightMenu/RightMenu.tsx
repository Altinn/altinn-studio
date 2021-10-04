import { Grid, IconButton, makeStyles, createTheme, Typography } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import altinnTheme from '../../../shared/theme/altinnStudioTheme';
import RuleModal from '../toolbar/RuleModal';
import ConditionalRenderingModal from '../toolbar/ConditionalRenderingModal';
import { getLanguageFromKey } from '../../../shared/utils/language';
import PagesContainer from './pages/PagesContainer';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';

const theme = createTheme(altinnTheme);

const useStyles = makeStyles({
  main: {
    overflowY: 'scroll',
    overflowX: 'hidden',
    height: 'inherit',
    marginTop: '0px',
    borderLeft: '1px solid #C9C9C9',
    paddingBottom: '8.0rem',
  },
  headerSection: {
    paddingLeft: '1.2rem',
    paddingTop: '2.4rem',
    color: theme.altinnPalette.primary.blueDarker,
    fontWeight: 400,
  },
  contentSection: {
    paddingLeft: '1.2rem',
    paddingTop: '1.2rem',
    fontSize: '1.4rem',
    fontWeight: 400,
    borderBottom: '1px solid #C9C9C9',
    paddingBottom: '2.4rem',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  addIcon: {
    color: theme.altinnPalette.primary.blueDarker,
  },
  textLink: {
    textDecoration: 'underline',
    textDecorationColor: altinnTheme.altinnPalette.primary.black,
    cursor: 'pointer',
  },
  marginTop24: {
    marginTop: '2.4rem',
  },
});

export interface IRightMenuProps {
  toggleFileEditor: (mode?: LogicMode) => void;
  language: object;
}

export default function RightMenu(props: IRightMenuProps) {
  const [conditionalModalOpen, setConditionalModalOpen] = React.useState<boolean>(false);
  const [ruleModalOpen, setRuleModalOpen] = React.useState<boolean>(false);
  const layoutOrder = useSelector((state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order);
  const classes = useStyles();
  const dispatch = useDispatch();

  function handleModalChange(type: 'conditionalRendering' | 'rules') {
    if (type === 'conditionalRendering') {
      setConditionalModalOpen(!conditionalModalOpen);
    } else if (type === 'rules') {
      setRuleModalOpen(!ruleModalOpen);
    }
  }

  function handleAddPage() {
    const name = getLanguageFromKey('right_menu.page', props.language) + (layoutOrder.length + 1);
    dispatch(FormLayoutActions.addLayout({ layout: name }));
  }

  return (
    <Grid
      container={true} direction='column'
      className={classes.main}
    >
      <Grid
        container={true} direction='row'
        className={classes.headerSection}
      >
        <Grid item={true} xs={10}>
          {getLanguageFromKey('right_menu.pages', props.language)}
        </Grid>
        <Grid item={true} xs={2}>
          <IconButton
            className={classes.addIcon} onClick={handleAddPage}
            aria-label={getLanguageFromKey('right_menu.pages_add_alt', props.language)}
          >
            <i className='fa fa-plus'/>
          </IconButton>
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.contentSection}
      >
        <Grid item={true} xs={12}>
          <PagesContainer />
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.headerSection}
      >
        <Grid item={true} xs={12}>
          {getLanguageFromKey('right_menu.dynamics', props.language)}
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.contentSection}
      >
        <Grid item={true} xs={12}>
          <Typography variant='caption'>
            {getLanguageFromKey('right_menu.dynamics_description', props.language)}&nbsp;
            <a
              target='_blank'
              rel='noopener noreferrer'
              href='https://docs.altinn.studio/app/development/logic/dynamic/'
            >
              {getLanguageFromKey('right_menu.dynamics_link', props.language)}
            </a>
          </Typography>
        </Grid>
        <Grid
          item={true} xs={12}
          className={classes.marginTop24}
        >
          <Typography
            variant='caption' classes={{ root: classes.textLink }}
            onClick={() => props.toggleFileEditor('Dynamics')}
          >
            {getLanguageFromKey('right_menu.dynamics_edit', props.language)}
          </Typography>
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.headerSection}
      >
        <Grid item={true} xs={10}>
          {getLanguageFromKey('right_menu.rules_calculations', props.language)}
        </Grid>
        <Grid item={true} xs={2}>
          <IconButton
            className={classes.addIcon} onClick={() => handleModalChange('rules')}
            aria-label={getLanguageFromKey('right_menu.rules_calculations_add_alt', props.language)}
          >
            <i className='fa fa-plus'/>
          </IconButton>
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.contentSection}
      >
        <Grid item={true} xs={12}>
          <RuleModal modalOpen={ruleModalOpen} handleClose={() => handleModalChange('rules')} />
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.headerSection}
      >
        <Grid item={true} xs={10}>
          {getLanguageFromKey('right_menu.rules_conditional_rendering', props.language)}
        </Grid>
        <Grid item={true} xs={2}>
          <IconButton
            className={classes.addIcon} onClick={() => handleModalChange('conditionalRendering')}
            aria-label={getLanguageFromKey('right_menu.rules_conditional_rendering_add_alt', props.language)}
          >
            <i className='fa fa-plus'/>
          </IconButton>
        </Grid>
      </Grid>
      <Grid
        container={true} direction='row'
        className={classes.contentSection}
      >
        <Grid item={true} xs={12}>
          <ConditionalRenderingModal modalOpen={conditionalModalOpen} handleClose={() => handleModalChange('conditionalRendering')}/>
        </Grid>
      </Grid>
    </Grid>
  );
}
