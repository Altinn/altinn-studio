/* eslint-disable no-undef */
/* eslint-disable react/no-array-index-key */
/* eslint-disable max-len */
import React from 'react';
import { Grid, makeStyles, createMuiTheme, TableContainer, Table, TableHead, TableRow, TableBody, TableCell, IconButton, useMediaQuery } from '@material-ui/core';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { componentHasValidations, repeatingGroupHasValidations } from 'src/utils/validation';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { getFormDataForComponentInRepeatingGroup, getTextResource } from 'src/utils/formComponentUtils';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { setupGroupComponents } from '../../../utils/layout';
import { ITextResource, IRepeatingGroups, IValidations, IOptions } from '../../../types';

export interface IRepeatingGroupTableProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[]
  repeatingGroupIndex: number;
  repeatingGroups: IRepeatingGroups;
  hiddenFields: string[];
  formData: any;
  options: IOptions;
  textResources: ITextResource[];
  language: any;
  currentView: string;
  layout: ILayout;
  validations: IValidations;
  editIndex: number;
  setEditIndex: (index: number) => void;
  filteredIndexes?: number[];
}

const theme = createMuiTheme(altinnAppTheme);

const useStyles = makeStyles({
  table: {
    tableLayout: 'fixed',
    marginBottom: '12px',
    wordBreak: 'break-word',
  },
  tableHeader: {
    borderBottom: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    '& th': {
      fontSize: '1.4rem',
      padding: '0px',
      paddingLeft: '6px',
      '& p': {
        fontWeight: 500,
        fontSize: '1.4rem',
        padding: '0px',
        paddingLeft: '6px',
      },
    },
  },
  tableBody: {
    '& td': {
      borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      padding: '0px',
      paddingLeft: '6px',
      fontSize: '1.4rem',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    },
  },
  tableRowError: {
    backgroundColor: '#F9CAD3;',
  },
  errorIcon: {
    fontSize: '2em',
    minWidth: '0px',
    minHeight: '0px',
    width: 'auto',
  },
  editIcon: {
    paddingLeft: '6px',
  },
  mobileGrid: {
    borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
  },
  mobileContainer: {
    borderTop: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    marginBottom: '1.2rem',
  },
  mobileText: {
    fontWeight: 500,
    float: 'left',
    maxWidth: '50%',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    '& p': {
      fontWeight: 500,
    },
  },
  mobileValueText: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '50%',
    minWidth: '50%',
  },
  textContainer: {
    width: '100%',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
});

export function RepeatingGroupTable({
  id,
  container,
  components,
  repeatingGroupIndex,
  editIndex,
  formData,
  options,
  textResources,
  currentView,
  hiddenFields,
  language,
  layout,
  repeatingGroups,
  validations,
  setEditIndex,
  filteredIndexes,
}: IRepeatingGroupTableProps): JSX.Element {
  const classes = useStyles();
  const renderComponents: ILayoutComponent[] = JSON.parse(JSON.stringify(components));
  const tableHeaderComponents = container.tableHeaders
    || components.map((c) => (c as any).baseComponentId || c.id) || [];
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const componentTitles: string[] = [];
  renderComponents.forEach((component: ILayoutComponent) => {
    const childId = (component as any).baseComponentId || component.id;
    if (tableHeaderComponents.includes(childId)) {
      componentTitles.push(component.textResourceBindings?.title || '');
    }
  });
  const repeatingGroupDeepCopyComponents = createRepeatingGroupComponents(
    container,
    renderComponents,
    repeatingGroupIndex,
    textResources,
    hiddenFields,
  );

  const getFormDataForComponent = (component: ILayoutComponent | ILayoutGroup, index: number): string => {
    return getFormDataForComponentInRepeatingGroup(formData, component, index, container.dataModelBindings.group, textResources, options);
  };

  const onClickEdit = (groupIndex: number) => {
    if (groupIndex === editIndex) {
      setEditIndex(-1);
    } else {
      setEditIndex(groupIndex);
    }
  };

  const childElementHasErrors = (element: ILayoutGroup | ILayoutComponent, index: number) => {
    if (element.type === 'Group') {
      return childGroupHasErrors(element as ILayoutGroup, index);
    }
    return componentHasValidations(validations, currentView, `${element.id}`);
  };

  const childGroupHasErrors = (childGroup: ILayoutGroup, index: number) => {
    const childGroupCount = repeatingGroups[childGroup.id]?.count;
    const childGroupComponents = layout.filter((childElement) => childGroup.children?.indexOf(childElement.id) > -1);
    const childRenderComponents = setupGroupComponents(childGroupComponents, childGroup.dataModelBindings?.group, index);
    const deepCopyComponents = createRepeatingGroupComponents(
      childGroup,
      childRenderComponents,
      childGroupCount,
      textResources,
      hiddenFields,
    );
    return repeatingGroupHasValidations(childGroup, deepCopyComponents, validations, currentView, repeatingGroups, layout, hiddenFields);
  };

  return (
    <Grid
      container={true}
      item={true}
      data-testid={`group-${id}`}
      id={`group-${id}`}
    >
      {!mobileView &&
      <TableContainer component={Grid}>
        <Table className={classes.table}>
          <TableHead className={classes.tableHeader}>
            <TableRow>
              {componentTitles.map((title: string) => (
                <TableCell align='left' key={title}>
                  {getTextResource(title, textResources)}
                </TableCell>
              ))}
              <TableCell/>
            </TableRow>
          </TableHead>
          <TableBody className={classes.tableBody}>
            {(repeatingGroupIndex >= 0) && [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
              const rowHasErrors = repeatingGroupDeepCopyComponents[index].some((component: ILayoutComponent | ILayoutGroup) => {
                return childElementHasErrors(component, index);
              });

              // Check if filter is applied and includes specified index.
              if (filteredIndexes && !filteredIndexes.includes(index)) {
                return null;
              }

              return (
                <TableRow className={rowHasErrors ? classes.tableRowError : ''} key={index}>
                  {components.map((component: ILayoutComponent) => {
                    const childId = (component as any).baseComponentId || component.id;
                    if (!tableHeaderComponents.includes(childId)) {
                      return null;
                    }
                    return (
                      <TableCell key={`${component.id} ${index}`}>
                        {getFormDataForComponent(component, index)}
                      </TableCell>
                    );
                  })}
                  <TableCell align='right' key={`delete-${index}`}>
                    <IconButton style={{ color: 'black' }} onClick={() => onClickEdit(index)}>
                      {rowHasErrors ?
                        getLanguageFromKey('general.edit_alt_error', language) :
                        getLanguageFromKey('general.edit_alt', language)}
                      <i className={rowHasErrors ?
                        `ai ai-circle-exclamation a-icon ${classes.errorIcon} ${classes.editIcon}` :
                        `fa fa-editing-file ${classes.editIcon}`}
                      />
                    </IconButton>
                  </TableCell>
                </TableRow>);
            })}
          </TableBody>
        </Table>
      </TableContainer>}
      {mobileView &&
      <Grid
        container={true}
        item={true}
        direction='column'
        className={classes.mobileContainer}
      >
        {(repeatingGroupIndex >= 0) && [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
          const rowHasErrors = repeatingGroupDeepCopyComponents[index].some((component: ILayoutComponent | ILayoutGroup) => {
            return childElementHasErrors(component, index);
          });
          return (
            <Grid
              item={true} container={true}
              justify='flex-end' direction='row'
              className={`${classes.mobileGrid} ${rowHasErrors ? classes.tableRowError : ''}`}
            >
              <Grid item={true}>
                <IconButton
                  style={{
                    color: 'black', padding: '0px', paddingLeft: '6px',
                  }} onClick={() => onClickEdit(index)}
                >
                  {rowHasErrors ?
                    getLanguageFromKey('general.edit_alt_error', language) :
                    getLanguageFromKey('general.edit_alt', language)}
                  <i className={rowHasErrors ?
                    `ai ai-circle-exclamation ${classes.errorIcon}` :
                    `fa fa-editing-file ${classes.editIcon}`}
                  />
                </IconButton>
              </Grid>
              {components.map((component: ILayoutComponent) => {
                const childId = (component as any).baseComponentId || component.id;
                if (!tableHeaderComponents.includes(childId)) {
                  return null;
                }
                return (
                  <Grid item={true} className={rowHasErrors ? `${classes.tableRowError} ${classes.textContainer}` : classes.textContainer}>
                    <div className={classes.mobileText}>
                      {getTextResource(component?.textResourceBindings?.title || '', textResources)}
                    </div>
                    <div
                      className={classes.mobileValueText}
                    >
                      {`: ${getFormDataForComponent(component, index)}`}
                    </div>
                  </Grid>
                );
              })}
            </Grid>
          );
        })}
      </Grid>
      }
    </Grid>
  );
}
