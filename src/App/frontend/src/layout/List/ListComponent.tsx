import React, { useState } from 'react';
import type { AriaAttributes, PropsWithChildren } from 'react';

import {
  BaseTable,
  Description,
  getLabelId,
  OptionalIndicator,
  Pagination as CustomPagination,
  RequiredIndicator,
  useIsMobile,
  useIsMobileOrTablet,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Checkbox, Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IDataModelBindingsForList } from '@app/layout-contract/generated/components/List/config.generated';

import { Caption } from 'src/components/form/caption/Caption';
import { RadioButton } from 'src/components/form/RadioButton';
import { useDataListQuery } from 'src/core/queries/dataLists';
import { FormStore } from 'src/features/form/FormContext';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useSaveObjectToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/List/ListComponent.module.css';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import { useShowOptionalIndicator } from 'src/utils/layout/useShowOptionalIndicator';
import type { Filter } from 'src/core/queries/dataLists';
import type { PropsFromGenericComponent } from 'src/layout';

type Row = Record<string, string | number | boolean>;
type SelectionMode = 'readonly' | 'single' | 'multiple';

export function getSelectionMode(bindings: IDataModelBindingsForList | undefined): SelectionMode {
  const hasValidBindings =
    bindings && Object.keys(bindings).length > 0 && Object.values(bindings).some((binding) => binding !== undefined);

  if (!hasValidBindings) {
    return 'readonly';
  }

  return bindings.group ? 'multiple' : 'single';
}

type ListComponentProps = Pick<PropsFromGenericComponent<'List'>, 'baseComponentId'> & { isSummary?: boolean };

export const ListComponent = ({ baseComponentId, isSummary }: ListComponentProps) => {
  const isMobileOrTablet = useIsMobileOrTablet();
  const pdfModeActive = usePdfModeActive();
  const mobileView = isMobileOrTablet && !pdfModeActive;
  const { lang, langAsString } = useLanguage();
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
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.List.textResourceBindings.help);

  const showOptionalMarking = useShowOptionalIndicator(config.labelSettings);

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
  const bindings = dataModelBindings ?? {};
  const selectionMode = getSelectionMode(bindings);
  const readOnly = selectionMode === 'readonly';
  // While the instance is locked, the selection shows but can't change
  const instanceLocked = FormStore.useIsInstanceLocked();
  const isMultipleSelection = selectionMode === 'multiple';
  const { formData, setValues } = useDataModelBindings(bindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');
  const { toggle, isChecked } = useSaveObjectToGroup(bindings);
  const selectedRow =
    !readOnly && !isMultipleSelection
      ? (data?.listItems.find((row) => Object.keys(formData).every((key) => row[key] === formData[key])) ?? '')
      : '';
  function handleSelectedRadioRow({ selectedValue }: { selectedValue: Row }) {
    if (instanceLocked) {
      return;
    }
    const next: Row = {};
    for (const binding of Object.keys(bindings)) {
      next[binding] = selectedValue[binding];
    }
    setValues(next);
  }
  function isRowSelected(row: Row): boolean {
    if (readOnly) {
      return false;
    }
    if (isMultipleSelection) {
      return isChecked(row);
    }
    return JSON.stringify(selectedRow) === JSON.stringify(row);
  }
  const title = summaryTitle || resolvedTitle;
  const tableHeading = title ? (
    <Heading
      level={2}
      data-size='sm'
    >
      <Lang id={title} />
      <RequiredIndicator
        required={required}
        readOnly={readOnly}
      />
      <OptionalIndicator
        required={required}
        readOnly={readOnly}
        showOptionalMarking={showOptionalMarking}
      />
    </Heading>
  ) : undefined;
  const handleRowClick = (row: Row) => {
    if (readOnly || instanceLocked) {
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
  // On small screens the header row only keeps the sortable columns, so that sorting is still possible
  const headerKeys = Object.keys(config.tableHeaders).filter(
    (key) => !mobileView || config.sortableColumns?.includes(key),
  );
  const renderValue = (value: Row[string] | undefined) => (typeof value === 'string' ? lang(value) : value);
  const indexedId = useIndexedId(baseComponentId);
  const componentId = isSummary ? `${indexedId}-summary` : indexedId;
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
  return (
    <ListStructure
      baseComponentId={baseComponentId}
      isSummary={isSummary}
    >
      <BaseTable
        headerBackground='tinted'
        rowHeight='large'
        cellFontSize='large'
        lookReachesNestedTables='all'
        className={cn(classes.listTable, {
          [classes.configuredColumns]: !!config.tableColumns,
          [classes.readOnly]: readOnly,
          [classes.mobileTable]: mobileView,
        })}
      >
        {isSummary ? (
          (title || description || help) && (
            <Caption
              id={getLabelId(componentId)}
              title={title && <Lang id={title} />}
              description={description && <Lang id={description} />}
              helpText={help ? { text: <Lang id={help} />, accessibleTitle: langAsString(title) } : undefined}
              labelSettings={{ optionalIndicator: false }}
            />
          )
        ) : title || description ? (
          <caption id={getLabelId(componentId)}>
            {tableHeading}
            {description && (
              <Description
                description={<Lang id={description} />}
                componentId={componentId}
              />
            )}
          </caption>
        ) : null}
        {config.tableColumns && !mobileView && (
          <colgroup>
            {!readOnly && <col className={classes.selectionColumn} />}
            {Object.keys(config.tableHeaders).map((key) => (
              <col
                key={key}
                style={{ width: config.tableColumns?.[key]?.width }}
              />
            ))}
          </colgroup>
        )}
        {headerKeys.length > 0 && (
          <BaseTable.Head>
            <BaseTable.Row>
              {!readOnly && (
                <BaseTable.HeaderCell>
                  <span className={utilClasses.visuallyHidden}>
                    <Lang id='list_component.controlsHeader' />
                  </span>
                </BaseTable.HeaderCell>
              )}
              {headerKeys.map((key) => {
                const isSortable = !pdfModeActive && config.sortableColumns?.includes(key);
                let sort: AriaAttributes['aria-sort'] = undefined;
                if (isSortable) {
                  sort = sortColumn === key ? sortDirection : 'none';
                }
                return (
                  <BaseTable.HeaderCell
                    key={key}
                    sort={sort}
                    onClick={isSortable ? () => handleSort(key) : undefined}
                  >
                    <Lang id={config.tableHeaders[key]} />
                  </BaseTable.HeaderCell>
                );
              })}
            </BaseTable.Row>
          </BaseTable.Head>
        )}
        <BaseTable.Body>
          {data?.listItems.map((row) => (
            <BaseTable.Row
              key={JSON.stringify(row)}
              onClick={!readOnly ? () => handleRowClick(row) : undefined}
            >
              {!readOnly && (
                <BaseTable.Cell
                  className={cn({
                    [classes.selectedRowCell]: isRowSelected(row) && !readOnly,
                    [classes.mobileControlCell]: mobileView,
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
                      readOnly={instanceLocked}
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
                      required={required}
                      name={indexedId}
                      readOnly={instanceLocked}
                    />
                  )}
                </BaseTable.Cell>
              )}
              {mobileView ? (
                <BaseTable.Cell
                  colSpan={headerKeys.length > 1 ? headerKeys.length : undefined}
                  className={cn({ [classes.selectedRowCell]: isRowSelected(row) && !readOnly })}
                >
                  <ListMobileRowContent
                    tableHeaders={config.tableHeaders}
                    tableHeadersMobile={config.tableHeadersMobile}
                    renderValue={(key) => renderValue(row[key])}
                  />
                </BaseTable.Cell>
              ) : (
                Object.keys(config.tableHeaders).map((key) => (
                  <BaseTable.Cell
                    key={key}
                    className={cn({
                      [classes.selectedRowCell]: isRowSelected(row) && !readOnly,
                    })}
                  >
                    {renderValue(row[key])}
                  </BaseTable.Cell>
                ))
              )}
            </BaseTable.Row>
          ))}
        </BaseTable.Body>
      </BaseTable>
      {config.pagination && (
        <Pagination
          id={componentId}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={config.pagination?.alternatives}
        />
      )}
    </ListStructure>
  );
};

type ListMobileRowContentProps = {
  tableHeaders: Record<string, string | undefined>;
  tableHeadersMobile: string[] | undefined;
  renderValue: (key: string) => React.ReactNode;
};

/**
 * On small screens, each row shows its columns as stacked 'Header: value' lines in a single cell, in the same way as
 * RepeatingGroup does. Only the columns in tableHeadersMobile are shown, if set.
 */
export function ListMobileRowContent({ tableHeaders, tableHeadersMobile, renderValue }: ListMobileRowContentProps) {
  const { langAsString } = useLanguage();
  const keys = Object.keys(tableHeaders).filter((key) => !tableHeadersMobile || tableHeadersMobile.includes(key));
  return (
    <div className={classes.mobileRowContent}>
      {keys.map((key) => {
        const header = tableHeaders[key];
        return (
          <div key={key}>
            {header && langAsString(header) && (
              <>
                <strong>
                  <Lang id={header} />:
                </strong>{' '}
              </>
            )}
            {renderValue(key)}
          </div>
        );
      })}
    </div>
  );
}

function ListStructure({ baseComponentId, isSummary, children }: PropsWithChildren<ListComponentProps>) {
  return isSummary ? (
    children
  ) : (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>{children}</ComponentStructureWrapper>
  );
}

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
    <BaseTable.Pager centered={isMobile}>
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
    </BaseTable.Pager>
  );
}
