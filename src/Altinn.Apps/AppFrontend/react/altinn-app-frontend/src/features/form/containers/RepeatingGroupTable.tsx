import React from 'react';
import {
  Grid,
  makeStyles,
  createTheme,
  TableRow,
  TableCell,
  IconButton,
  useMediaQuery,
} from '@material-ui/core';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import {
  componentHasValidations,
  repeatingGroupHasValidations,
} from 'src/utils/validation';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import {
  getFormDataForComponentInRepeatingGroup,
  getTextResource,
} from 'src/utils/formComponentUtils';
import {
  AltinnMobileTable,
  AltinnMobileTableItem,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';
import { IMobileTableItem } from 'altinn-shared/components/molecules/AltinnMobileTableItem';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { setupGroupComponents } from '../../../utils/layout';
import {
  ITextResource,
  IRepeatingGroups,
  IValidations,
  IOptions,
  ITextResourceBindings,
} from '../../../types';
import { ILanguage } from 'altinn-shared/types';

export interface IRepeatingGroupTableProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  repeatingGroupIndex: number;
  repeatingGroups: IRepeatingGroups;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  hiddenFields: string[];
  formData: any;
  options: IOptions;
  textResources: ITextResource[];
  language: ILanguage;
  currentView: string;
  layout: ILayout;
  validations: IValidations;
  editIndex: number;
  setEditIndex: (index: number) => void;
  filteredIndexes?: number[];
}

const theme = createTheme(altinnAppTheme);

const useStyles = makeStyles({
  errorIcon: {
    fontSize: '2em',
    minWidth: '0px',
    minHeight: '0px',
    width: 'auto',
    color: theme.altinnPalette.primary.red,
    marginBottom: '2px',
    marginTop: '1px',
  },
  editIcon: {
    paddingRight: '6px',
    fontSize: '28px',
    marginTop: '-2px',
  },
  tableEditButton: {
    color: theme.altinnPalette.primary.blueDark,
    fontWeight: 700,
    borderRadius: '5px',
    padding: '6px 12px',
    margin: '8px 2px',
    '&:hover': {
      background: 'none',
      outline: `1px dotted ${theme.altinnPalette.primary.blueDark}`
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueLighter,
      outline: `2px dotted ${theme.altinnPalette.primary.blueDark}`
    }
  }
});

function getEditButtonText(
  language: ILanguage,
  isEditing: boolean,
  textResources: ITextResource[],
  textResourceBindings?: ITextResourceBindings) {
  if (isEditing && textResourceBindings?.edit_button_close) {
    return getTextResourceByKey(textResourceBindings?.edit_button_close, textResources);
  } else if (!isEditing && textResourceBindings?.edit_button_open) {
    return getTextResourceByKey(textResourceBindings?.edit_button_open, textResources);
  }

  return getLanguageFromKey('general.edit_alt', language);
}

export function RepeatingGroupTable({
  id,
  container,
  components,
  repeatingGroupIndex,
  repeatingGroupDeepCopyComponents,
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
  const renderComponents: ILayoutComponent[] = JSON.parse(
    JSON.stringify(components),
  );
  const tableHeaderComponents =
    container.tableHeaders ||
    components.map((c) => (c as any).baseComponentId || c.id) ||
    [];
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const componentTitles: string[] = [];
  renderComponents.forEach((component: ILayoutComponent) => {
    const childId = (component as any).baseComponentId || component.id;
    if (tableHeaderComponents.includes(childId)) {
      componentTitles.push(component.textResourceBindings?.title || '');
    }
  });

  const getFormDataForComponent = (
    component: ILayoutComponent | ILayoutGroup,
    index: number,
  ): string => {
    return getFormDataForComponentInRepeatingGroup(
      formData,
      component,
      index,
      container.dataModelBindings.group,
      textResources,
      options,
    );
  };

  const onClickEdit = (groupIndex: number) => {
    if (groupIndex === editIndex) {
      setEditIndex(-1);
    } else {
      setEditIndex(groupIndex);
    }
  };

  const childElementHasErrors = (
    element: ILayoutGroup | ILayoutComponent,
    index: number,
  ) => {
    if (element.type === 'Group') {
      return childGroupHasErrors(element as ILayoutGroup, index);
    }
    return componentHasValidations(validations, currentView, `${element.id}`);
  };

  const childGroupHasErrors = (childGroup: ILayoutGroup, index: number) => {
    const childGroupCount = repeatingGroups[childGroup.id]?.count;
    const childGroupComponents = layout.filter(
      (childElement) => childGroup.children?.indexOf(childElement.id) > -1,
    );
    const childRenderComponents = setupGroupComponents(
      childGroupComponents,
      childGroup.dataModelBindings?.group,
      index,
    );
    const deepCopyComponents = createRepeatingGroupComponents(
      childGroup,
      childRenderComponents,
      childGroupCount,
      textResources,
      hiddenFields,
    );
    return repeatingGroupHasValidations(
      childGroup,
      deepCopyComponents,
      validations,
      currentView,
      repeatingGroups,
      layout,
      hiddenFields,
    );
  };

  return (
    <Grid
      container={true}
      item={true}
      data-testid={`group-${id}`}
      id={`group-${id}`}
    >
      {!mobileView && (
        <AltinnTable id={`group-${id}-table`}>
          <AltinnTableHeader id={`group-${id}-table-header`}>
            <TableRow>
              {componentTitles.map((title: string) => (
                <TableCell align='left' key={title}>
                  {getTextResource(title, textResources)}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </AltinnTableHeader>
          <AltinnTableBody id={`group-${id}-table-body`}>
            {repeatingGroupIndex >= 0 &&
              [...Array(repeatingGroupIndex + 1)].map(
                (_x: any, index: number) => {
                  const rowHasErrors = repeatingGroupDeepCopyComponents[
                    index
                  ].some((component: ILayoutComponent | ILayoutGroup) => {
                    return childElementHasErrors(component, index);
                  });

                  // Check if filter is applied and includes specified index.
                  if (filteredIndexes && !filteredIndexes.includes(index)) {
                    return null;
                  }

                  return (
                    <AltinnTableRow valid={!rowHasErrors} key={index}>
                      {components.map((component: ILayoutComponent) => {
                        const childId =
                          (component as any).baseComponentId || component.id;
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
                        <IconButton
                          className={classes.tableEditButton}
                          onClick={() => onClickEdit(index)}
                        >
                          <i
                            className={
                              rowHasErrors
                                ? `ai ai-circle-exclamation a-icon ${classes.errorIcon} ${classes.editIcon}`
                                : `fa fa-edit ${classes.editIcon}`
                            }
                          />
                          {rowHasErrors
                            ? getLanguageFromKey(
                              'general.edit_alt_error',
                              language,
                            )
                            : getEditButtonText(
                              language,
                              editIndex === index,
                              textResources,
                              container.textResourceBindings
                            )}
                        </IconButton>
                      </TableCell>
                    </AltinnTableRow>
                  );
                },
              )}
          </AltinnTableBody>
        </AltinnTable>
      )}
      {mobileView && (
        <AltinnMobileTable id={`group-${id}-table`}>
          {repeatingGroupIndex >= 0 &&
            [...Array(repeatingGroupIndex + 1)].map(
              (_x: any, index: number) => {
                const rowHasErrors = repeatingGroupDeepCopyComponents[
                  index
                ].some((component: ILayoutComponent | ILayoutGroup) => {
                  return childElementHasErrors(component, index);
                });
                const items: IMobileTableItem[] = [];
                components.forEach((component) => {
                  const childId =
                    (component as any).baseComponentId || component.id;
                  if (tableHeaderComponents.includes(childId)) {
                    items.push({
                      label: getTextResource(
                        component?.textResourceBindings?.title,
                        textResources,
                      ),
                      value: getFormDataForComponent(component, index),
                    });
                  }
                });
                return (
                  <AltinnMobileTableItem
                    key={index}
                    items={items}
                    valid={!rowHasErrors}
                    onClick={() => onClickEdit(index)}
                    iconNode={
                      <>
                        <i
                          className={
                            rowHasErrors
                              ? `ai ai-circle-exclamation ${classes.errorIcon}`
                              : `fa fa-edit ${classes.editIcon}`
                          }
                        />
                        {rowHasErrors
                          ? getLanguageFromKey(
                            'general.edit_alt_error',
                            language,
                          )
                          : getEditButtonText(
                            language,
                            editIndex === index,
                            textResources,
                            container.textResourceBindings
                          )}
                      </>
                    }
                  />
                );
              },
            )}
        </AltinnMobileTable>
      )}
    </Grid>
  );
}
