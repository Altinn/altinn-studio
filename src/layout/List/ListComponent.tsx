import React from 'react';

import { Pagination, ResponsiveTable, SortDirection } from '@altinn/altinn-design-system';
import { FormControl, FormLabel } from '@material-ui/core';
import cn from 'classnames';
import type { ChangeProps, ResponsiveTableConfig, SortProps } from '@altinn/altinn-design-system';
import type { DescriptionText } from '@altinn/altinn-design-system/dist/types/src/components/Pagination/Pagination';

import { DataListsActions } from 'src/features/dataLists/dataListsSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useGetDataList } from 'src/hooks/useGetDataList';
import { useRadioStyles } from 'src/layout/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/layout';

export type IListProps = PropsFromGenericComponent<'List'>;

const defaultDataList: any[] = [];

export const ListComponent = ({
  node,
  formData,
  handleDataChange,
  getTextResourceAsString,
  language,
  legend,
}: IListProps) => {
  const { tableHeaders, id, pagination, sortableColumns, tableHeadersMobile } = node.item;
  const classes = useRadioStyles();
  const RenderLegend = legend;
  const dynamicDataList = useGetDataList({ id });
  const calculatedDataList = dynamicDataList || defaultDataList;
  const defaultPagination = pagination ? pagination.default : 0;
  const rowsPerPage = useAppSelector((state) => state.dataListState.dataLists[id]?.size || defaultPagination);
  const currentPage = useAppSelector((state) => state.dataListState.dataLists[id]?.pageNumber || 0);

  const sortColumn = useAppSelector((state) => state.dataListState.dataLists[id]?.sortColumn || null);
  const sortDirection = useAppSelector(
    (state) => state.dataListState.dataLists[id]?.sortDirection || SortDirection.NotActive,
  );
  const totalItemsCount = useAppSelector(
    (state) => state.dataListState.dataLists[id]?.paginationData?.totaltItemsCount || 0,
  );

  const handleChange = ({ selectedValue: selectedValue }: ChangeProps<Record<string, string>>) => {
    for (const key in formData) {
      handleDataChange(selectedValue[key], { key });
    }
  };

  const tableHeadersValues = { ...tableHeaders };
  for (const key in tableHeaders) {
    tableHeadersValues[key] = getTextResourceAsString(tableHeaders[key]) ?? '';
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

  const dispatch = useAppDispatch();

  const handleSortChange = (props: SortProps & { column: string }) => {
    dispatch(
      DataListsActions.setSort({
        key: id || '',
        sortColumn: props.column,
        sortDirection: props.previous === SortDirection.Descending ? SortDirection.Ascending : SortDirection.Descending,
      }),
    );
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(
      DataListsActions.setPageSize({
        key: id || '',
        size: parseInt(event.target.value, 10),
      }),
    );
  };

  const handleChangeCurrentPage = (newPage: number) => {
    dispatch(
      DataListsActions.setPageNumber({
        key: id || '',
        pageNumber: newPage,
      }),
    );
  };
  const renderPagination = () => {
    if (pagination) {
      return (
        <Pagination
          numberOfRows={totalItemsCount}
          rowsPerPageOptions={pagination?.alternatives ? pagination?.alternatives : []}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={handleChangeCurrentPage}
          descriptionTexts={language['list_component'] as DescriptionText}
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
    footer: renderPagination(),
  };

  return (
    <FormControl
      component='fieldset'
      style={{ width: '100%' }}
    >
      <FormLabel
        component='legend'
        classes={{ root: cn(classes.legend) }}
        id={`${id}-label`}
      >
        <RenderLegend />
      </FormLabel>
      <div style={{ overflow: 'auto' }}>
        <ResponsiveTable config={config}></ResponsiveTable>
      </div>
    </FormControl>
  );
};
