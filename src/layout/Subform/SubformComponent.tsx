import React, { useState } from 'react';

import { Spinner, Table } from '@digdir/designsystemet-react';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@navikt/ds-icons';
import cn from 'classnames';
import dot from 'dot-object';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { Caption } from 'src/components/form/caption/Caption';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useStrictDataElements, useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsSubformPage, useNavigate } from 'src/features/routing/AppRoutingContext';
import { useAddEntryMutation, useDeleteEntryMutation } from 'src/features/subformData/useSubformMutations';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsForNode } from 'src/features/validation/selectors/componentValidationsForNode';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Subform/SubformComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function SubformComponent({ node }: PropsFromGenericComponent<'Subform'>): React.JSX.Element | null {
  const {
    id,
    layoutSet,
    textResourceBindings,
    tableColumns = [],
    showAddButton = true,
    showDeleteButton = true,
  } = useNodeItem(node);

  const isSubformPage = useIsSubformPage();
  if (isSubformPage) {
    window.logErrorOnce('Cannot use a SubformComponent component within a subform');
    throw new Error('Cannot use a SubformComponent component within a subform');
  }

  const dataType = useDataTypeFromLayoutSet(layoutSet);

  if (!dataType) {
    window.logErrorOnce(`Unable to find data type for subform with id ${id}`);
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  const { langAsString } = useLanguage();
  const addEntryMutation = useAddEntryMutation(dataType);
  const dataElements = useStrictDataElements(dataType);
  const navigate = useNavigate();
  const lock = FD.useLocking(id);
  const { performProcess, isAnyProcessing: isAddingDisabled, isThisProcessing: isAdding } = useIsProcessing();
  const [subformEntries, updateSubformEntries] = useState(dataElements);

  const subformIdsWithError = useComponentValidationsForNode(node).find(isSubformValidation)?.subformDataElementIds;

  const addEntry = () =>
    performProcess(async () => {
      const currentLock = await lock();
      try {
        const result = await addEntryMutation.mutateAsync({});
        navigate(`${node.id}/${result.id}`);
      } catch {
        // NOTE: Handled by useAddEntryMutation
      } finally {
        currentLock.unlock();
      }
    });

  return (
    <ComponentStructureWrapper node={node}>
      <Flex
        id={node.id}
        container
        item
        data-componentid={node.id}
        data-componentbaseid={node.baseId}
      >
        <Table
          id={`subform-${id}-table`}
          className={classes.subformTable}
        >
          <Caption
            id={`subform-${id}-caption`}
            title={<Lang id={textResourceBindings?.title} />}
            description={textResourceBindings?.description && <Lang id={textResourceBindings?.description} />}
          />
          {subformEntries.length > 0 && (
            <>
              <Table.Head id={`subform-${id}-table-body`}>
                <Table.Row>
                  {tableColumns.length ? (
                    tableColumns.map((entry, index) => (
                      <Table.HeaderCell
                        className={classes.tableCellFormatting}
                        key={index}
                      >
                        <Lang id={entry.headerContent} />
                      </Table.HeaderCell>
                    ))
                  ) : (
                    <Table.HeaderCell className={classes.tableCellFormatting}>
                      <Lang id='form_filler.subform_default_header' />
                    </Table.HeaderCell>
                  )}
                  <Table.HeaderCell>
                    <span className={classes.visuallyHidden}>
                      <Lang id='general.edit' />
                    </span>
                  </Table.HeaderCell>
                  {showDeleteButton && (
                    <Table.HeaderCell>
                      <span className={classes.visuallyHidden}>
                        <Lang id='general.delete' />
                      </span>
                    </Table.HeaderCell>
                  )}
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {subformEntries.map((dataElement, index) => (
                  <SubformTableRow
                    key={dataElement.id}
                    dataElement={dataElement}
                    node={node}
                    hasErrors={Boolean(subformIdsWithError?.includes(dataElement.id))}
                    rowNumber={index}
                    showDeleteButton={showDeleteButton}
                    deleteEntryCallback={(d) => {
                      const items = subformEntries.filter((x) => x.id != d.id);
                      updateSubformEntries([...items]);
                    }}
                  />
                ))}
              </Table.Body>
            </>
          )}
        </Table>

        {showAddButton && (
          <div className={classes.addButton}>
            <Button
              id={`subform-${id}-add-button`}
              size='md'
              disabled={isAddingDisabled}
              isLoading={isAdding}
              onClick={async () => await addEntry()}
              onKeyUp={async (event: React.KeyboardEvent<HTMLButtonElement>) => {
                const allowedKeys = ['enter', ' ', 'spacebar'];
                if (allowedKeys.includes(event.key.toLowerCase())) {
                  await addEntry();
                }
              }}
              variant='secondary'
              fullWidth
            >
              {!isAdding && (
                <AddIcon
                  fontSize='1.5rem'
                  aria-hidden='true'
                />
              )}
              {langAsString(textResourceBindings?.addButton)}
            </Button>
          </div>
        )}
      </Flex>
    </ComponentStructureWrapper>
  );
}

function SubformTableRow({
  dataElement,
  node,
  hasErrors,
  rowNumber,
  showDeleteButton,
  deleteEntryCallback,
}: {
  dataElement: IData;
  node: LayoutNode<'Subform'>;
  hasErrors: boolean;
  rowNumber: number;
  showDeleteButton: boolean;
  deleteEntryCallback: (dataElement: IData) => void;
}) {
  const id = dataElement.id;
  const { tableColumns = [] } = useNodeItem(node);
  const instanceId = useStrictInstanceId();
  const url = getStatefulDataModelUrl(instanceId, id, true);
  const { isFetching, data, error, failureCount } = useFormDataQuery(url);
  const { langAsString } = useLanguage();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteEntryMutation = useDeleteEntryMutation(id);
  const deleteButtonText = langAsString('general.delete');
  const editButtonText = langAsString('general.edit');

  const numColumns = tableColumns.length;
  const actualColumns = showDeleteButton ? numColumns + 1 : numColumns;

  if (isFetching) {
    return (
      <Table.Row>
        <Table.Cell colSpan={actualColumns}>
          <Spinner title={langAsString('general.loading')} />
        </Table.Cell>
      </Table.Row>
    );
  } else if (error) {
    console.error(`Error loading data element ${id} from server. Gave up after ${failureCount} attempt(s).`, error);
    return (
      <Table.Row>
        <Table.Cell colSpan={actualColumns}>
          <Lang id='form_filler.error_fetch_subform' />
        </Table.Cell>
      </Table.Row>
    );
  }

  const deleteEntry = async () => {
    setIsDeleting(true);

    try {
      await deleteEntryMutation.mutateAsync(id);
      deleteEntryCallback(dataElement);
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <Table.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      className={cn({ [classes.disabledRow]: isDeleting, [classes.tableRowError]: hasErrors })}
    >
      {tableColumns.length ? (
        tableColumns.map((entry, index) => (
          <Table.Cell key={`subform-cell-${id}-${index}`}>
            <DataQueryWithDefaultValue
              data={data}
              query={entry.cellContent.query}
              defaultValue={entry.cellContent.default}
            />
          </Table.Cell>
        ))
      ) : (
        <Table.Cell key={`subform-cell-${id}-0`}>{String(id)}</Table.Cell>
      )}
      <Table.Cell className={classes.buttonCell}>
        <div className={classes.buttonInCellWrapper}>
          <Button
            disabled={isDeleting}
            variant='tertiary'
            color='second'
            onClick={async () => navigate(`${node.id}/${id}${hasErrors ? '?validate=true' : ''}`)}
            aria-label={editButtonText}
            className={classes.tableButton}
          >
            {editButtonText}
            <EditIcon
              fontSize='1rem'
              aria-hidden='true'
            />
          </Button>
        </div>
      </Table.Cell>
      {showDeleteButton && (
        <Table.Cell className={classes.buttonCell}>
          <div className={classes.buttonInCellWrapper}>
            <Button
              disabled={isDeleting}
              variant='tertiary'
              color='danger'
              onClick={async () => await deleteEntry()}
              aria-label={deleteButtonText}
              className={classes.tableButton}
            >
              {deleteButtonText}
              <DeleteIcon
                fontSize='1rem'
                aria-hidden='true'
              />
            </Button>
          </div>
        </Table.Cell>
      )}
    </Table.Row>
  );
}

export interface DataQueryParams {
  data: unknown;
  query: string;
  defaultValue?: string;
}

export function DataQueryWithDefaultValue(props: DataQueryParams) {
  const { data, query, defaultValue } = props;
  const { langAsString } = useLanguage();
  let content = dot.pick(query, data);

  if (!content && defaultValue != undefined) {
    const textLookup = langAsString(defaultValue);
    content = textLookup ? textLookup : defaultValue;
  }

  if (typeof content === 'object' || content === undefined) {
    return null;
  }

  return <>{String(content)}</>;
}
