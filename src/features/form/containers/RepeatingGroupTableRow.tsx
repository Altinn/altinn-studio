import React from 'react';

import { TableCell, TableRow } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { createTheme, makeStyles, useMediaQuery } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getFormDataForComponentInRepeatingGroup, getTextResource } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ExprResolved, ExprUnresolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/form/data';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutCompInput } from 'src/layout/Input/types';
import type { ILayoutComponent } from 'src/layout/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IOptions, IRepeatingGroups, ITextResource, ITextResourceBindings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IRepeatingGroupTableRowProps {
  id: string;
  className?: string;
  container: ExprUnresolved<ILayoutGroup>;
  components: ExprUnresolved<ILayoutComponent | ILayoutGroup>[];
  repeatingGroups: IRepeatingGroups | null;
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  textResources: ITextResource[];
  language: ILanguage;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  onClickRemove: (groupIndex: number) => void;
  deleting: boolean;
  index: number;
  rowHasErrors: boolean;
  tableComponents: ExprUnresolved<ILayoutComponent>[];
  onEditClick: () => void;
  mobileView: boolean;
  deleteFunctionality?: {
    popoverOpen: boolean;
    popoverPanelIndex: number;
    onDeleteClick: () => void;
    setPopoverOpen: (open: boolean) => void;
    onOpenChange: (index: number) => void;
    onPopoverDeleteClick: (index: number) => () => void;
  };
}

const theme = createTheme(AltinnAppTheme);

const useStyles = makeStyles({
  popoverCurrentCell: {
    zIndex: 1,
    position: 'relative',
  },
  buttonCell: {
    minWidth: 'unset',
    maxWidth: 'unset',
    width: '1px', // Shrinks column width
    '& > div': {
      margin: 0,
    },
  },
  buttonInCellWrapper: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '100%',
  },
  tableRowError: {
    backgroundColor: theme.altinnPalette.primary.redLight,
  },
  tableButton: {
    width: 'max-content', // Stops column from shrinking too much
  },
  contentFormatting: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    lineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  },
});

function getTableTitle(textResourceBindings: ITextResourceBindings) {
  if (textResourceBindings.tableTitle) {
    return textResourceBindings.tableTitle;
  }
  if (textResourceBindings.title) {
    return textResourceBindings.title;
  }
  return '';
}

function getEditButtonText(
  language: ILanguage,
  isEditing: boolean,
  textResources: ITextResource[],
  textResourceBindings?: ITextResourceBindings,
) {
  if (isEditing && textResourceBindings?.edit_button_close) {
    return getTextResourceByKey(textResourceBindings?.edit_button_close, textResources);
  } else if (!isEditing && textResourceBindings?.edit_button_open) {
    return getTextResourceByKey(textResourceBindings?.edit_button_open, textResources);
  }

  return isEditing
    ? getLanguageFromKey('general.save_and_close', language)
    : getLanguageFromKey('general.edit_alt', language);
}

function getTextAlignment(
  component: ExprUnresolved<ILayoutComponent> | ExprResolved<ILayoutComponent>,
): 'left' | 'center' | 'right' {
  const formatting = (component as ILayoutCompInput).formatting;
  if (formatting && formatting.align) {
    return formatting.align;
  }
  if (formatting && formatting.number) {
    return 'right';
  }
  return 'left';
}

export function RepeatingGroupTableRow({
  id,
  className,
  container,
  components,
  editIndex,
  formData,
  attachments,
  options,
  textResources,
  language,
  repeatingGroups,
  deleting,
  index,
  rowHasErrors,
  tableComponents,
  onEditClick,
  mobileView,
  deleteFunctionality,
}: IRepeatingGroupTableRowProps): JSX.Element {
  const classes = useStyles();
  const mobileViewSmall = useMediaQuery('(max-width:768px)');

  const { popoverOpen, popoverPanelIndex, onDeleteClick, setPopoverOpen, onPopoverDeleteClick, onOpenChange } =
    deleteFunctionality || {};

  const node = useResolvedNode(id);
  const row =
    node?.item.type === 'Group' && 'rows' in node.item && node.item.rows[index] ? node.item.rows[index] : undefined;
  const expressionsForRow = row && row.groupExpressions;
  const edit = {
    ...(node?.item.type === 'Group' && node.item.edit),
    ...expressionsForRow?.edit,
  } as ExprResolved<ILayoutGroup['edit']>;
  const resolvedTextBindings = {
    ...node?.item.textResourceBindings,
    ...expressionsForRow?.textResourceBindings,
  } as ExprResolved<ILayoutGroup['textResourceBindings']>;

  const getFormDataForComponent = (
    component: ExprUnresolved<ILayoutComponent | ILayoutGroup>,
    index: number,
  ): string => {
    return getFormDataForComponentInRepeatingGroup(
      formData,
      attachments,
      component,
      index,
      container.dataModelBindings?.group,
      textResources,
      options,
      repeatingGroups,
    );
  };

  const isEditingRow = index === editIndex;

  const editButtonText = rowHasErrors
    ? getLanguageFromKey('general.edit_alt_error', language)
    : getEditButtonText(language, editIndex === index, textResources, resolvedTextBindings);

  const deleteButtonText = getLanguageFromKey('general.delete', language);

  const firstCellData = getFormDataForComponent(components[0], index);

  return (
    <TableRow
      key={`repeating-group-row-${index}`}
      className={cn(
        {
          [classes.tableRowError]: rowHasErrors,
        },
        className,
      )}
    >
      {!mobileView ? (
        tableComponents.map((component) => (
          <TableCell
            key={`${component.id}-${index}`}
            style={{ textAlign: getTextAlignment(component) }}
          >
            <span className={classes.contentFormatting}>
              {!isEditingRow ? getFormDataForComponent(component, index) : null}
            </span>
          </TableCell>
        ))
      ) : (
        <TableCell>
          {tableComponents.map((component, i, { length }) => {
            const componentNode = node?.children(
              (c) => c.baseComponentId === component.baseComponentId || c.baseComponentId === component.id,
            );
            return (
              !isEditingRow && (
                <React.Fragment key={`${component.id}-${index}`}>
                  <b className={classes.contentFormatting}>
                    {getTextResource(getTableTitle(componentNode?.item.textResourceBindings || {}), textResources)}:
                  </b>
                  <span className={classes.contentFormatting}>{getFormDataForComponent(component, index)}</span>
                  {i < length - 1 && <div style={{ height: 8 }} />}
                </React.Fragment>
              )
            );
          })}
        </TableCell>
      )}
      {!mobileView ? (
        <>
          <TableCell
            key={`edit-${index}`}
            className={classes.buttonCell}
            colSpan={edit?.deleteButton === false ? 2 : 1}
          >
            <div className={classes.buttonInCellWrapper}>
              <Button
                aria-expanded={isEditingRow}
                aria-controls={isEditingRow ? `group-edit-container-${id}-${index}` : undefined}
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Secondary}
                icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                iconPlacement='right'
                onClick={onEditClick}
                aria-label={`${editButtonText} ${firstCellData}`}
                data-testid='edit-button'
                className={classes.tableButton}
              >
                {editButtonText}
              </Button>
            </div>
          </TableCell>
          {edit?.deleteButton !== false &&
            setPopoverOpen &&
            onOpenChange &&
            onPopoverDeleteClick &&
            typeof popoverOpen === 'boolean' && (
              <TableCell
                key={`delete-${index}`}
                className={cn(
                  {
                    [classes.popoverCurrentCell]: index == popoverPanelIndex,
                  },
                  classes.buttonCell,
                )}
              >
                <div className={classes.buttonInCellWrapper}>
                  {(() => {
                    const deleteButton = (
                      <Button
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Danger}
                        icon={<DeleteIcon aria-hidden='true' />}
                        iconPlacement='right'
                        disabled={deleting}
                        onClick={onDeleteClick}
                        aria-label={`${deleteButtonText}-${firstCellData}`}
                        data-testid='delete-button'
                        className={classes.tableButton}
                      >
                        {deleteButtonText}
                      </Button>
                    );

                    if (edit?.alertOnDelete) {
                      return (
                        <DeleteWarningPopover
                          trigger={deleteButton}
                          side='left'
                          language={language}
                          deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                          messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                          open={popoverPanelIndex == index && popoverOpen}
                          setPopoverOpen={setPopoverOpen}
                          onCancelClick={() => onOpenChange(index)}
                          onPopoverDeleteClick={onPopoverDeleteClick(index)}
                        />
                      );
                    } else {
                      return deleteButton;
                    }
                  })()}
                </div>
              </TableCell>
            )}
        </>
      ) : (
        <TableCell
          className={classes.buttonCell}
          style={{ verticalAlign: 'top' }}
        >
          <div className={classes.buttonInCellWrapper}>
            <Button
              aria-expanded={isEditingRow}
              aria-controls={isEditingRow ? `group-edit-container-${id}-${index}` : undefined}
              variant={ButtonVariant.Quiet}
              color={ButtonColor.Secondary}
              icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
              iconPlacement='right'
              onClick={onEditClick}
              aria-label={`${editButtonText} ${firstCellData}`}
              data-testid='edit-button'
              className={classes.tableButton}
            >
              {(isEditingRow || !mobileViewSmall) && editButtonText}
            </Button>
            {edit?.deleteButton !== false &&
              setPopoverOpen &&
              onOpenChange &&
              onPopoverDeleteClick &&
              typeof popoverOpen === 'boolean' && (
                <>
                  <div style={{ height: 8 }} />
                  {(() => {
                    const deleteButton = (
                      <Button
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Danger}
                        icon={<DeleteIcon aria-hidden='true' />}
                        iconPlacement='right'
                        disabled={deleting}
                        onClick={onDeleteClick}
                        aria-label={`${deleteButtonText}-${firstCellData}`}
                        data-testid='delete-button'
                        className={classes.tableButton}
                      >
                        {(isEditingRow || !mobileViewSmall) && deleteButtonText}
                      </Button>
                    );

                    if (edit?.alertOnDelete) {
                      return (
                        <DeleteWarningPopover
                          trigger={deleteButton}
                          side='left'
                          language={language}
                          deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                          messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                          open={popoverPanelIndex == index && popoverOpen}
                          setPopoverOpen={setPopoverOpen}
                          onCancelClick={() => onOpenChange(index)}
                          onPopoverDeleteClick={onPopoverDeleteClick(index)}
                        />
                      );
                    } else {
                      return deleteButton;
                    }
                  })()}
                </>
              )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
