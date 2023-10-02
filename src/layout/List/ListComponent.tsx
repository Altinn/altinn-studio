import React, { useMemo, useState } from 'react';

import { Pagination } from '@altinn/altinn-design-system';
import { LegacyFieldSet, ResponsiveTable } from '@digdir/design-system-react';
import type { DescriptionText } from '@altinn/altinn-design-system/dist/types/src/components/Pagination/Pagination';
import type { ChangeProps, ResponsiveTableConfig, SortDirection, SortProps } from '@digdir/design-system-react';

import { useDataListQuery } from 'src/hooks/queries/useDataListQuery';
import { useLanguage } from 'src/hooks/useLanguage';
import type { Filter } from 'src/hooks/queries/useDataListQuery';
import type { PropsFromGenericComponent } from 'src/layout';

export type IListProps = PropsFromGenericComponent<'List'>;

const defaultDataList: any[] = [];

export const ListComponent = ({ node, formData, handleDataChange, legend }: IListProps) => {
  const { tableHeaders, pagination, sortableColumns, tableHeadersMobile, mapping, secure, dataListId } = node.item;
  const { langAsString, language, lang } = useLanguage();
  const RenderLegend = legend;
  const [pageSize, setPageSize] = useState<number>(pagination?.default || 0);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>('notActive');
  const filter = useMemo(
    () =>
      ({
        pageSize,
        pageNumber,
        sortColumn,
        sortDirection,
      }) as Filter,
    [pageNumber, pageSize, sortColumn, sortDirection],
  );
  const { data } = useDataListQuery(filter, dataListId, secure, mapping);
  const calculatedDataList = (data && data.listItems) || defaultDataList;

  const handleChange = ({ selectedValue: selectedValue }: ChangeProps<Record<string, string>>) => {
    for (const key in formData) {
      handleDataChange(selectedValue[key], { key });
    }
  };

  const tableHeadersValues = { ...tableHeaders };
  for (const key in tableHeaders) {
    tableHeadersValues[key] = langAsString(tableHeaders[key]);
  }

  const selectedRow: Record<string, string> = React.useMemo(() => {
    let matchRow: boolean[] = [];
    if (!formData || JSON.stringify(formData) === '{}') {
      return {};
    }
    for (const row of calculatedDataList) {
      for (const key in formData) {
        matchRow.push(formData[key] === row[key]);
      }
      if (!matchRow.includes(false)) {
        return row;
      }
      matchRow = [];
    }
    return {};
  }, [formData, calculatedDataList]);

  const handleSortChange = (props: SortProps & { column: string }) => {
    const { column, next } = props;
    setSortColumn(column);
    setSortDirection(next);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(event.target.value, 10));
  };

  const handleChangeCurrentPage = (newPage: number) => {
    setPageNumber(newPage);
  };
  const renderPagination = () => {
    if (pagination) {
      return (
        <Pagination
          numberOfRows={data?._metaData.totaltItemsCount}
          rowsPerPageOptions={pagination?.alternatives ? pagination?.alternatives : []}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          currentPage={pageNumber}
          setCurrentPage={handleChangeCurrentPage}
          descriptionTexts={((language && language['list_component']) || {}) as unknown as DescriptionText}
        />
      );
    } else {
      return undefined;
    }
  };

  const config: ResponsiveTableConfig<Record<string, string>> = {
    rows: calculatedDataList,
    headers: tableHeadersValues,
    showColumnsMobile: tableHeadersMobile,
    columnSort: {
      onSortChange: ({ column, next, previous }) => {
        handleSortChange({ previous, next, column });
      },
      sortable: sortableColumns ? sortableColumns : [],
      currentlySortedColumn: sortColumn,
      currentDirection: sortDirection,
    },
    rowSelection: {
      onSelectionChange: (row) => handleChange({ selectedValue: row }),
      selectedValue: selectedRow,
    },
    renderCell: Object.keys(tableHeaders).reduce(
      // Add lang as the renderCell function for all inputs that are of type string.
      (acc, next) => ({ ...acc, [next]: (v) => (typeof v === 'string' ? lang(v) : v) }),
      {},
    ),
    footer: renderPagination(),
  };

  return (
    <LegacyFieldSet
      legend={<RenderLegend />}
      style={{ width: '100%' }}
    >
      <div style={{ overflow: 'auto' }}>
        <ResponsiveTable config={config}></ResponsiveTable>
      </div>
    </LegacyFieldSet>
  );
};
