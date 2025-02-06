import React, { useState } from 'react';
import type { AriaAttributes } from 'react';

import { Heading, Radio, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Pagination as CustomPagination } from 'src/app-components/Pagination/Pagination';
import { Description } from 'src/components/form/Description';
import { RadioButton } from 'src/components/form/RadioButton';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getLabelId } from 'src/components/label/Label';
import { useDataListQuery } from 'src/features/dataLists/useDataListQuery';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/List/ListComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Filter } from 'src/features/dataLists/useDataListQuery';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';

export type IListProps = PropsFromGenericComponent<'List'>;
type Row = Record<string, string | number | boolean>;

export const ListComponent = ({ node }: IListProps) => {
  const isMobile = useIsMobile();
  const item = useNodeItem(node);
  const {
    tableHeaders,
    pagination,
    sortableColumns,
    tableHeadersMobile,
    mapping,
    queryParameters,
    secure,
    dataListId,
    required,
  } = item;

  const [pageSize, setPageSize] = useState<number>(pagination?.default ?? 0);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<AriaAttributes['aria-sort']>('none');

  const filter: Filter = {
    pageSize,
    pageNumber,
    sortColumn,
    sortDirection,
  };

  const { data } = useDataListQuery(filter, dataListId, secure, mapping, queryParameters);
  const bindings = item.dataModelBindings ?? ({} as IDataModelBindingsForList);
  const { formData, setValues } = useDataModelBindings(bindings);

  const tableHeadersToShowInMobile = Object.keys(tableHeaders).filter(
    (key) => !tableHeadersMobile || tableHeadersMobile.includes(key),
  );

  const selectedRow =
    data?.listItems.find((row) => Object.keys(formData).every((key) => row[key] === formData[key])) ?? '';

  function handleRowSelect({ selectedValue }: { selectedValue: Row }) {
    const next: Row = {};
    for (const binding of Object.keys(bindings)) {
      next[binding] = selectedValue[binding];
    }
    setValues(next);
  }

  function isRowSelected(row: Row): boolean {
    return JSON.stringify(selectedRow) === JSON.stringify(row);
  }

  const title = item.textResourceBindings?.title;
  const description = item.textResourceBindings?.description;
  if (isMobile) {
    return (
      <ComponentStructureWrapper node={node}>
        <Radio.Group
          role='radiogroup'
          required={required}
          legend={
            <Heading
              level={2}
              size='sm'
            >
              <Lang id={title} />
              <RequiredIndicator required={required} />
            </Heading>
          }
          description={description && <Lang id={description} />}
          className={classes.mobileRadioGroup}
          value={JSON.stringify(selectedRow)}
        >
          {data?.listItems.map((row) => (
            <Radio
              key={JSON.stringify(row)}
              value={JSON.stringify(row)}
              className={cn(classes.mobileRadio, { [classes.selectedRow]: isRowSelected(row) })}
              onClick={() => handleRowSelect({ selectedValue: row })}
            >
              {tableHeadersToShowInMobile.map((key) => (
                <div key={key}>
                  <strong>
                    <Lang id={tableHeaders[key]} />
                  </strong>
                  <span>{typeof row[key] === 'string' ? <Lang id={row[key]} /> : row[key]}</span>
                </div>
              ))}
            </Radio>
          ))}
        </Radio.Group>
        <Pagination
          pageSize={pageSize}
          setPageSize={setPageSize}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={pagination?.alternatives}
        />
      </ComponentStructureWrapper>
    );
  }

  return (
    <ComponentStructureWrapper node={node}>
      <Table className={classes.listTable}>
        {title && (
          <caption id={getLabelId(node.id)}>
            <Heading
              level={2}
              size='sm'
            >
              <Lang id={title} />
              <RequiredIndicator required={required} />
            </Heading>
            {description && (
              <Description
                description={<Lang id={description} />}
                componentId={node.id}
              />
            )}
          </caption>
        )}
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell />
            {Object.entries(tableHeaders).map(([key, value]) => (
              <Table.HeaderCell
                key={key}
                sortable={sortableColumns?.includes(key)}
                sort={sortColumn === key ? sortDirection : undefined}
                onSortClick={() => {
                  if (sortColumn === key) {
                    setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
                  } else {
                    setSortDirection('descending');
                    setSortColumn(key);
                  }
                }}
              >
                <Lang id={value} />
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {data?.listItems.map((row) => (
            <Table.Row
              key={JSON.stringify(row)}
              onClick={() => {
                handleRowSelect({ selectedValue: row });
              }}
            >
              <Table.Cell
                className={cn({
                  [classes.selectedRowCell]: isRowSelected(row),
                })}
              >
                <RadioButton
                  className={classes.radio}
                  aria-label={JSON.stringify(row)}
                  onChange={() => {
                    handleRowSelect({ selectedValue: row });
                  }}
                  value={JSON.stringify(row)}
                  checked={isRowSelected(row)}
                  name={node.id}
                />
              </Table.Cell>
              {Object.keys(tableHeaders).map((key) => (
                <Table.Cell
                  key={key}
                  className={cn({
                    [classes.selectedRowCell]: isRowSelected(row),
                  })}
                >
                  {typeof row[key] === 'string' ? <Lang id={row[key]} /> : row[key]}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {pagination && (
        <Pagination
          pageSize={pageSize}
          setPageSize={setPageSize}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={pagination?.alternatives}
        />
      )}
    </ComponentStructureWrapper>
  );
};

type PaginationProps = {
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  pageNumber: number;
  setPageNumber: (pageNumber: number) => void;
  numberOfRows: number | undefined;
  rowsPerPageOptions: number[] | undefined;
};

function Pagination({
  pageSize,
  setPageSize,
  pageNumber,
  setPageNumber,
  numberOfRows = 0,
  rowsPerPageOptions = [],
}: PaginationProps) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  function handlePageSizeChange(newSize: number) {
    setPageNumber(0);
    setPageSize(newSize);
  }
  const textStrings = language?.['list_component'];

  return (
    <div className={cn({ [classes.paginationMobile]: isMobile }, classes.pagination, 'fds-table__header__cell')}>
      <CustomPagination
        nextLabel={textStrings['nextPage']}
        nextLabelAriaLabel={textStrings['nextPageAriaLabel']}
        previousLabel={textStrings['previousPage']}
        previousLabelAriaLabel={textStrings['previousPageAriaLabel']}
        rowsPerPageText={textStrings['rowsPerPage']}
        size='sm'
        currentPage={pageNumber}
        numberOfRows={numberOfRows}
        pageSize={pageSize}
        onChange={setPageNumber}
        showRowsPerPageDropdown
        onPageSizeChange={(value) => handlePageSizeChange(+value)}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </div>
  );
}
