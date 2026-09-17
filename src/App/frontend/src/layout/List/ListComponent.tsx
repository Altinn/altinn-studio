import React, { useState } from 'react';
import type { AriaAttributes } from 'react';

import {
  Description,
  getLabelId,
  Pagination as CustomPagination,
  RequiredIndicator,
  useIsMobile,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import {
  Checkbox,
  Fieldset,
  Heading,
  Radio,
  Table,
  useCheckboxGroup,
  useRadioGroup,
} from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IDataModelBindingsForList } from '@app/layout-contract/generated/components/List/config.generated';

import { RadioButton } from 'src/components/form/RadioButton';
import { useDataListQuery } from 'src/features/dataLists/useDataListQuery';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { useSaveObjectToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/List/ListComponent.module.css';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Filter } from 'src/features/dataLists/useDataListQuery';
import type { PropsFromGenericComponent } from 'src/layout';

type Row = Record<string, string | number | boolean>;
type SelectionMode = 'readonly' | 'single' | 'multiple';

function getSelectionMode(bindings: IDataModelBindingsForList): SelectionMode {
  const hasValidBindings = Object.keys(bindings).length > 0 && Object.values(bindings).some((b) => b !== undefined);

  if (!hasValidBindings) {
    return 'readonly';
  }

  return bindings.group ? 'multiple' : 'single';
}

export const ListComponent = ({ baseComponentId }: PropsFromGenericComponent<'List'>) => {
  const isMobile = useIsMobile();
  const { langAsString } = useLanguage();
  const config = useComponentConfig(baseComponentId, 'List');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'List');
  const required = useEvalExpression(config.required, Expressions.List.required);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.List.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.List.textResourceBindings.title,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.List.textResourceBindings.description,
  );

  const [pageSize, setPageSize] = useState<number>(config.pagination?.default ?? 0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<AriaAttributes['aria-sort']>('none');
  const filter: Filter = {
    pageSize,
    pageNumber: currentPage - 1,
    sortColumn,
    sortDirection,
  };
  const { data } = useDataListQuery(
    filter,
    config.dataListId,
    config.secure,
    useResolvedQueryParameters(config.queryParameters),
  );
  const bindings = dataModelBindings ?? ({} as IDataModelBindingsForList);
  // Determine selection mode based on bindings
  const selectionMode = getSelectionMode(bindings);
  const readOnly = selectionMode === 'readonly';
  const isMultipleSelection = selectionMode === 'multiple';
  const { formData, setValues } = useDataModelBindings(bindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');
  const { toggle, isChecked } = useSaveObjectToGroup(bindings);
  const tableHeadersToShowInMobile = Object.keys(config.tableHeaders).filter(
    (key) => !config.tableHeadersMobile || config.tableHeadersMobile.includes(key),
  );
  const selectedRow = !isMultipleSelection
    ? (data?.listItems.find((row) => Object.keys(formData).every((key) => row[key] === formData[key])) ?? '')
    : '';
  function handleSelectedRadioRow({ selectedValue }: { selectedValue: Row }) {
    const next: Row = {};
    for (const binding of Object.keys(bindings)) {
      next[binding] = selectedValue[binding];
    }
    setValues(next);
  }
  function isRowSelected(row: Row): boolean {
    if (isMultipleSelection) {
      return isChecked(row);
    }
    return JSON.stringify(selectedRow) === JSON.stringify(row);
  }
  const title = summaryTitle || resolvedTitle;
  const handleRowClick = (row: Row) => {
    if (readOnly) {
      return;
    }
    if (isMultipleSelection) {
      toggle(row);
    } else {
      handleSelectedRadioRow({ selectedValue: row });
    }
  };
  const handleSort = (key: string) => {
    if (sortColumn === key && sortDirection === 'ascending') {
      setSortColumn(undefined);
      setSortDirection(undefined);
    } else {
      setSortColumn(key);
      setSortDirection(sortColumn === key && sortDirection === 'descending' ? 'ascending' : 'descending');
    }
  };
  const renderListItems = (
    row: Row,
    tableHeaders: {
      [x: string]: string | undefined;
    },
  ) =>
    tableHeadersToShowInMobile.map((key) => (
      <div key={key}>
        <strong>
          <Lang id={tableHeaders[key]} />
        </strong>
        <span>{typeof row[key] === 'string' ? <Lang id={row[key]} /> : row[key]}</span>
      </div>
    ));
  const indexedId = useIndexedId(baseComponentId);
  const getRowLabel = (row: Row): string =>
    Object.entries(row)
      .map(([key]) => {
        const headerId = config.tableHeaders[key];
        if (!headerId) {
          return '';
        }
        const header = langAsString(headerId);
        const raw = row[key];
        const value = typeof raw === 'string' ? langAsString(raw) : String(raw);
        return `${header}: ${value}`;
      })
      .filter(Boolean)
      .join(', ');
  const { getRadioProps } = useRadioGroup({
    name: indexedId,
    value: JSON.stringify(selectedRow),
    required,
  });
  const { getCheckboxProps } = useCheckboxGroup({
    name: indexedId,
    required,
  });
  if (isMobile && !readOnly) {
    return (
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        {isMultipleSelection ? (
          <Fieldset>
            <Fieldset.Legend>
              {description && (
                <Fieldset.Description>
                  <Lang id={description} />
                </Fieldset.Description>
              )}
              <Heading
                level={2}
                data-size='sm'
              >
                <Lang id={title} />
                <RequiredIndicator required={required} />
              </Heading>
            </Fieldset.Legend>
            <div>
              {data?.listItems.map((row, idx) => (
                <Checkbox
                  key={idx}
                  className={cn(classes.mobile)}
                  {...getCheckboxProps({ value: JSON.stringify(row) })}
                  onClick={() => handleRowClick(row)}
                  value={JSON.stringify(row)}
                  checked={isChecked(row)}
                  label={renderListItems(row, config.tableHeaders)}
                />
              ))}
            </div>
          </Fieldset>
        ) : (
          <Fieldset className={classes.mobileGroup}>
            <Fieldset.Legend>
              <Heading
                level={2}
                data-size='sm'
              >
                <Lang id={title} />
                <RequiredIndicator required={required} />
              </Heading>
            </Fieldset.Legend>
            {description && (
              <Fieldset.Description>
                <Lang id={description} />
              </Fieldset.Description>
            )}

            {data?.listItems.map((row, idx) => (
              <Radio
                key={idx}
                {...getRadioProps({ value: JSON.stringify(row) })}
                value={JSON.stringify(row)}
                className={cn(classes.mobile, { [classes.selectedRow]: isRowSelected(row) })}
                onClick={() => handleSelectedRadioRow({ selectedValue: row })}
                label={renderListItems(row, config.tableHeaders)}
              />
            ))}
          </Fieldset>
        )}
        <Pagination
          id={baseComponentId}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={config.pagination?.alternatives}
        />
      </ComponentStructureWrapper>
    );
  }
  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Table className={classes.listTable}>
        {title && (
          <caption id={getLabelId(indexedId)}>
            <Heading
              level={2}
              data-size='sm'
            >
              <Lang id={title} />
              <RequiredIndicator required={required} />
            </Heading>
            {description && (
              <Description
                description={<Lang id={description} />}
                componentId={indexedId}
              />
            )}
          </caption>
        )}
        <Table.Head>
          <Table.Row>
            {!readOnly && (
              <Table.HeaderCell>
                <span className={utilClasses.visuallyHidden}>
                  <Lang id='list_component.controlsHeader' />
                </span>
              </Table.HeaderCell>
            )}
            {Object.entries(config.tableHeaders).map(([key, value]) => {
              const isSortable = config.sortableColumns?.includes(key);
              let sort: AriaAttributes['aria-sort'] = undefined;
              if (isSortable) {
                sort = sortColumn === key ? sortDirection : 'none';
              }
              return (
                <Table.HeaderCell
                  key={key}
                  sort={sort}
                  onClick={isSortable ? () => handleSort(key) : undefined}
                >
                  <Lang id={value} />
                </Table.HeaderCell>
              );
            })}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {data?.listItems.map((row) => (
            <Table.Row
              key={JSON.stringify(row)}
              onClick={!readOnly ? () => handleRowClick(row) : undefined}
            >
              {!readOnly && (
                <Table.Cell
                  className={cn({
                    [classes.selectedRowCell]: isRowSelected(row) && !readOnly,
                  })}
                >
                  {isMultipleSelection ? (
                    <Checkbox
                      className={classes.toggleControl}
                      label={<span className='sr-only'>{getRowLabel(row)}</span>}
                      onChange={() => toggle(row)}
                      onClick={(e) => e.stopPropagation()}
                      value={JSON.stringify(row)}
                      checked={isChecked(row)}
                      name={indexedId}
                    />
                  ) : (
                    <RadioButton
                      className={classes.toggleControl}
                      label={getRowLabel(row)}
                      hideLabel
                      onChange={() => handleSelectedRadioRow({ selectedValue: row })}
                      onClick={(e) => e.stopPropagation()}
                      value={JSON.stringify(row)}
                      checked={isRowSelected(row)}
                      name={indexedId}
                    />
                  )}
                </Table.Cell>
              )}
              {Object.keys(config.tableHeaders).map((key) => (
                <Table.Cell
                  key={key}
                  className={cn({
                    [classes.selectedRowCell]: isRowSelected(row) && !readOnly,
                  })}
                >
                  {typeof row[key] === 'string' ? <Lang id={row[key]} /> : row[key]}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {config.pagination && (
        <Pagination
          id={baseComponentId}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={config.pagination?.alternatives}
        />
      )}
    </ComponentStructureWrapper>
  );
};

type PaginationProps = {
  id: string;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  currentPage: number;
  setCurrentPage: (pageNumber: number) => void;
  numberOfRows: number | undefined;
  rowsPerPageOptions: number[] | undefined;
};

function Pagination({
  id,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  numberOfRows = 0,
  rowsPerPageOptions = [],
}: PaginationProps) {
  const isMobile = useIsMobile();
  const { langAsString } = useLanguage();

  function handlePageSizeChange(newSize: number) {
    setCurrentPage(1);
    setPageSize(newSize);
  }
  return (
    <div className={cn({ [classes.paginationMobile]: isMobile }, classes.pagination, 'ds-table__header__cell')}>
      <CustomPagination
        id={id}
        nextLabel={langAsString('list_component.nextPage')}
        previousLabel={langAsString('list_component.previousPage')}
        rowsPerPageText={langAsString('list_component.rowsPerPage')}
        pageAriaLabelTemplate={langAsString('general.page_number', ['{page}'])}
        size='sm'
        currentPage={currentPage}
        numberOfRows={numberOfRows}
        pageSize={pageSize}
        setCurrentPage={setCurrentPage}
        showRowsPerPageDropdown
        onPageSizeChange={(value) => handlePageSizeChange(+value)}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </div>
  );
}
