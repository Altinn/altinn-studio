import React, { useMemo, useState } from 'react';

import { Pagination } from '@altinn/altinn-design-system';
import { LegacyResponsiveTable } from '@digdir/design-system-react';
import type { DescriptionText } from '@altinn/altinn-design-system/dist/types/src/components/Pagination/Pagination';
import type { LegacyResponsiveTableConfig } from '@digdir/design-system-react';
import type {
  ChangeProps,
  SortDirection,
} from '@digdir/design-system-react/dist/types/components/legacy/LegacyTable/utils';

import { useDataListQuery } from 'src/features/dataLists/useDataListQuery';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Filter } from 'src/features/dataLists/useDataListQuery';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';

export type IListProps = PropsFromGenericComponent<'List'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultDataList: any[] = [];
const defaultBindings: IDataModelBindingsForList = {};

export const ListComponent = ({ node }: IListProps) => {
  const item = useNodeItem(node);
  const { tableHeaders, pagination, sortableColumns, tableHeadersMobile, mapping, secure, dataListId } = item;
  const { langAsString, language, lang } = useLanguage();
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

  const bindings = item.dataModelBindings || defaultBindings;
  const { formData, setValues } = useDataModelBindings(bindings);

  const handleChange = ({ selectedValue: selectedValue }: ChangeProps<Record<string, string>>) => {
    const next: Record<string, string> = {};
    for (const binding of Object.keys(bindings)) {
      next[binding] = selectedValue[binding];
    }
    setValues(next);
  };

  const tableHeadersValues = { ...tableHeaders };
  for (const key in tableHeaders) {
    tableHeadersValues[key] = langAsString(tableHeaders[key]);
  }

  const selectedRow: Record<string, string> = React.useMemo(() => {
    let matchRow: boolean[] = [];
    if (!formData || Object.keys(formData).length === 0) {
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

  const renderPagination = () =>
    pagination && (
      <Pagination
        numberOfRows={data?._metaData.totaltItemsCount ?? 0}
        rowsPerPageOptions={pagination?.alternatives ? pagination?.alternatives : []}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          setPageSize(parseInt(event.target.value, 10));
        }}
        currentPage={pageNumber}
        setCurrentPage={(newPage: number) => {
          setPageNumber(newPage);
        }}
        descriptionTexts={((language && language['list_component']) || {}) as unknown as DescriptionText}
      />
    );

  const config: LegacyResponsiveTableConfig<Record<string, string>> = {
    rows: calculatedDataList,
    headers: tableHeadersValues,
    showColumnsMobile: tableHeadersMobile,
    columnSort: {
      onSortChange: ({ column, next }) => {
        setSortColumn(column);
        setSortDirection(next);
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
    <ComponentStructureWrapper
      node={node}
      label={{ node, renderLabelAs: 'legend' }}
    >
      <div style={{ overflow: 'auto' }}>
        <LegacyResponsiveTable config={config} />
      </div>
    </ComponentStructureWrapper>
  );
};
