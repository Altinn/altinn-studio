import { Grid, IconButton, ListItem, makeStyles } from '@material-ui/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { EditModalContent } from '../components/config/EditModalContent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import '../styles/index.css';
import {
  getComponentTitleByComponentType,
  getTextResource,
  truncate,
} from '../utils/language';
import { componentIcons } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type {
  FormComponentType,
  IFormComponent,
  IAppState,
} from '../types/global';

const useStyles = makeStyles({
  active: {
    backgroundColor: '#fff',
    boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    padding: '0.45rem 1.05rem 1.05rem 1.05rem',
    marginBottom: '1.2rem',
    border: '0.15rem solid #fff',
  },
  activeWrapper: {
    padding: '1.0rem 1.2rem 2rem 1.2rem',
  },
  caption: {
    position: 'absolute',
    right: '1.2rem',
    top: '0.6rem',
    fontSize: '1.2rem',
  },
  formComponent: {
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
    border: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    color: `${altinnTheme.altinnPalette.primary.blueDarker}!important`,
    padding: '0.45rem 1.05rem 1.05rem 1.05rem',
    marginBottom: '1.2rem',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blue,
    paddingLeft: '0',
    '&:hover': {
      background: 'none',
    },
  },
  formComponentTitle: {
    marginTop: '0.6rem',
  },
  gridWrapper: {
    marginBottom: '0rem',
    padding: '0 1.1rem 0 1.1rem',
  },
  gridWrapperActive: {
    marginBottom: '0rem',
    padding: '0',
  },
  gridForBtn: {
    marginTop: '-0.2rem !important',
    marginLeft: '-1rem !important',
    visibility: 'hidden',
    paddingBottom: '0.8rem',
  },
  gridForBtnGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'hidden',
    paddingBottom: '0.8rem',
  },
  gridForBtnActive: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
    marginLeft: '0.2rem',
  },
  gridForBtnActiveGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  gridForBtnSingleActive: {
    marginTop: '-0.2rem !important',
    marginLeft: '-1rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  gridForBtnSingleActiveGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  inputHelper: {
    marginTop: '1rem',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  listBorder: {
    padding: '1.1rem 1.2rem 0 1.2rem',
    marginTop: '0.1rem',
    borderLeft: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    borderRight: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    outline: '0 !important',
    '&.first': {
      paddingTop: '1.2rem',
      borderTop: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    },
    '&.last': {
      paddingBottom: '1.2rem',
      borderBottom: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
      marginBottom: '1.2rem',
    },
    '& $active': {
      marginBottom: '0rem !important',
    },
  },
  noOutline: {
    outline: '0 !important',
  },
  specialBtn: {
    fontSize: '0.6em !important',
    paddingLeft: '0.4rem',
  },
  textPrimaryDark: {
    color: `${altinnTheme.altinnPalette.primary.blueDarker}!important`,
  },
  textSecondaryDark: {
    color: `${altinnTheme.altinnPalette.primary.grey}!important`,
  },
  wrapper: {
    '&:hover': {
      cursor: 'pointer',
    },
    '&:hover $gridForBtn': {
      visibility: 'visible',
    },
    '&:hover $gridForBtnGroup': {
      visibility: 'visible',
    },
  },
  icon: {
    color: '#6a6a6a',
    margin: '0 1.2rem 0 1.2rem',
  },
});

export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendItemToParent: any;
  singleSelected: boolean;
  partOfGroup?: boolean;
  children: any;
}

export function EditContainer(props: IEditContainerProvidedProps) {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [component, setComponent] = React.useState<any>({
    id: props.id,
    ...props.component,
  });
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [listItem, setListItem] = React.useState<any>({
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    inEditMode: false,
    order: null,
  });

  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const activeList = useSelector(
    (state: IAppState) => state.formDesigner.layout.activeList,
  );
  const language = useSelector(
    (state: IAppState) => state.appData.languageState.language,
  );
  const orderList = useSelector((state: IAppState) =>
    GetLayoutOrderSelector(state),
  );
  const textResources = useSelector(
    (state: IAppState) => state.appData.textResources.resources,
  );

  const handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    setComponent({ ...updatedComponent });
  };

  const handleComponentDelete = (e: any): void => {
    if (activeList.length > 1) {
      dispatch(
        FormLayoutActions.deleteFormComponents({ components: activeList }),
      );
    } else {
      dispatch(
        FormLayoutActions.deleteFormComponents({ components: [props.id] }),
      );
    }
    dispatch(FormLayoutActions.deleteActiveList());
    e.stopPropagation();
  };

  const handleOpenEdit = (): void => {
    setIsEditMode(true);
    const newListItem = { ...listItem, inEditMode: true };
    setListItem(newListItem);
    props.sendItemToParent(listItem);
  };

  const handleSetActive = (): void => {
    if (!isEditMode) {
      const key: any = Object.keys(orderList)[0];
      const orderIndex = orderList[key].indexOf(listItem.id);
      const newListItem = { ...listItem, order: orderIndex };
      setListItem(newListItem);
      props.sendItemToParent(newListItem);
    }
  };

  const handleSave = (): void => {
    const newListItem = { ...listItem, inEditMode: false };
    setListItem(newListItem);
    setIsEditMode(false);

    if (JSON.stringify(component) !== JSON.stringify(props.component)) {
      handleSaveChange(component);
      if (props.id !== component.id) {
        dispatch(
          FormLayoutActions.updateFormComponentId({
            newId: component.id,
            currentId: props.id,
          }),
        );
      }
    }

    props.sendItemToParent(newListItem);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleDiscard = (): void => {
    setComponent({ ...props.component });
    setIsEditMode(false);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleSaveChange = (callbackComponent: FormComponentType): void => {
    dispatch(
      FormLayoutActions.updateFormComponent({
        id: props.id,
        updatedComponent: callbackComponent,
      }),
    );
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleSetActive();
    }
  };

  const setPlacementClass = (index: number) => {
    const first = activeList[index].firstInActiveList;
    const last = activeList[index].lastInActiveList;
    if (first) {
      return last ? 'first last' : 'first';
    }
    return last ? 'last' : '';
  };

  const btnGrid = () => {
    if (activeList.length > 1) {
      if (props.partOfGroup) {
        return classes.gridForBtnActiveGroup;
      }
      return classes.gridForBtnActive;
    }
    if (activeList.length === 1) {
      if (props.partOfGroup) {
        return classes.gridForBtnSingleActiveGroup;
      }
      return classes.gridForBtnSingleActive;
    }
    if (props.partOfGroup) {
      return classes.gridForBtnGroup;
    }
    return classes.gridForBtn;
  };

  const activeListIndex = activeList.findIndex(
    (item: any) => item.id === props.id,
  );

  return (
    <>
      <Grid container={true}>
        <Grid
          container={true}
          direction='row'
          spacing={0}
          className={classes.wrapper}
        >
          <Grid
            item={true}
            xs={11}
            className={
              activeList.length > 1 && activeListIndex >= 0
                ? classes.gridWrapperActive
                : props.partOfGroup
                ? ''
                : classes.gridWrapper
            }
          >
            <div
              className={
                activeList.length > 1 && activeListIndex >= 0
                  ? `${classes.listBorder} ${setPlacementClass(
                      activeListIndex,
                    )}`
                  : classes.noOutline
              }
            >
              <ListItem
                className={
                  activeListIndex > -1 || isEditMode
                    ? classes.active
                    : props.component.type === 'Group'
                    ? 'formGroup'
                    : classes.formComponent
                }
                onClick={handleSetActive}
                tabIndex={0}
                onKeyPress={handleKeyPress}
                component='div'
              >
                {isEditMode ? (
                  <Grid item={true} xs={12} className={classes.activeWrapper}>
                    <EditModalContent
                      component={JSON.parse(JSON.stringify(component))}
                      language={language}
                      handleComponentUpdate={handleComponentUpdate}
                    />
                  </Grid>
                ) : (
                  <div
                    className={`${classes.textPrimaryDark} ${classes.formComponentTitle}`}
                  >
                    <i
                      className={`${classes.icon} ${
                        componentIcons[component.type] || 'fa fa-help-circle'
                      }`}
                    />
                    {component.textResourceBindings?.title
                      ? truncate(
                          getTextResource(
                            component.textResourceBindings.title,
                            textResources,
                          ),
                          80,
                        )
                      : getComponentTitleByComponentType(
                          component.type,
                          language,
                        ) ||
                        getLanguageFromKey(
                          'ux_editor.component_unknown',
                          language,
                        )}
                  </div>
                )}
              </ListItem>
            </div>
          </Grid>
          {!isEditMode && (
            <Grid item={true} xs={1}>
              <Grid container={true} direction='row' className={btnGrid()}>
                <Grid item={true} xs={12}>
                  {(activeListIndex === 0 || activeList.length < 1) && (
                    <IconButton
                      type='button'
                      className={`${classes.formComponentsBtn} ${classes.specialBtn}`}
                      onClick={handleComponentDelete}
                      tabIndex={0}
                    >
                      <i className='fa fa-circletrash' />
                    </IconButton>
                  )}
                </Grid>
                <Grid item={true} xs={12}>
                  {(activeList.length < 1 ||
                    (activeList.length === 1 && activeListIndex === 0)) && (
                    <IconButton
                      type='button'
                      className={classes.formComponentsBtn}
                      onClick={handleOpenEdit}
                      tabIndex={0}
                    >
                      <i className='fa fa-edit' />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}
          {isEditMode && (
            <Grid item={true} xs={1}>
              <Grid
                container={true}
                direction='row'
                // eslint-disable-next-line max-len
                className={
                  props.partOfGroup
                    ? classes.gridForBtnSingleActiveGroup
                    : classes.gridForBtnSingleActive
                }
              >
                <Grid item={true} xs={12}>
                  <IconButton
                    type='button'
                    className={`${classes.formComponentsBtn} ${classes.specialBtn}`}
                    onClick={handleDiscard}
                    tabIndex={0}
                  >
                    <i className='fa fa-circlecancel' />
                  </IconButton>
                </Grid>
                <Grid item={true} xs={12}>
                  <IconButton
                    type='button'
                    className={`${classes.formComponentsBtn} ${classes.specialBtn}`}
                    onClick={handleSave}
                    tabIndex={0}
                  >
                    <i className='fa fa-circlecheck' />
                  </IconButton>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </>
  );
}
