import React from 'react';

import {
  Pagination,
  RadioButton,
  SortDirection,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from '@altinn/altinn-design-system';
import type { ChangeProps, RowData, SortProps } from '@altinn/altinn-design-system';

import type { PropsFromGenericComponent } from '..';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { useGetDataList } from 'src/components/hooks';
import { DataListsActions } from 'src/shared/resources/dataLists/dataListsSlice';

import { getLanguageFromKey } from 'altinn-shared/utils';

export type IListProps = PropsFromGenericComponent<'List'>;

const defaultDataList: any[] = [];
export interface rowValue {
  [key: string]: string;
}

export const ListComponent = ({
  tableHeaders,
  id,
  pagination,
  formData,
  handleDataChange,
  getTextResourceAsString,
  sortableColumns,
  dataModelBindings,
  language,
}: IListProps) => {
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

  const handleChange = ({ selectedValue }: ChangeProps) => {
    for (const key in formData) {
      handleDataChange(selectedValue[key], { key: key });
    }
  };

  const renderRow = (datalist) => {
    const cells: JSX.Element[] = [];
    for (const key of Object.keys(datalist)) {
      cells.push(<TableCell key={`${key}_${datalist[key]}`}>{datalist[key]}</TableCell>);
    }
    return cells;
  };

  const renderHeaders = (headers) => {
    const cell: JSX.Element[] = [];
    for (const header of headers) {
      if ((sortableColumns || []).includes(header)) {
        cell.push(
          <TableCell
            onChange={handleSortChange}
            sortKey={header}
            key={header}
            sortDirecton={sortColumn === header ? sortDirection : SortDirection.NotActive}
          >
            {getTextResourceAsString(header)}
          </TableCell>,
        );
      } else {
        cell.push(<TableCell key={header}>{getTextResourceAsString(header)}</TableCell>);
      }
    }
    return cell;
  };

  const dispatch = useAppDispatch();

  const handleSortChange = ({ sortedColumn, previousSortDirection }: SortProps) => {
    dispatch(
      DataListsActions.setSort({
        key: id || '',
        sortColumn: sortedColumn,
        sortDirection:
          previousSortDirection === SortDirection.Descending ? SortDirection.Ascending : SortDirection.Descending,
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
  const rowAsValue = (datalist) => {
    const chosenRowData: rowValue = {};
    for (const key in dataModelBindings) {
      chosenRowData[key] = datalist[key];
    }
    return chosenRowData;
  };
  const rowAsValueString = (datalist) => {
    return JSON.stringify(rowAsValue(datalist));
  };

  const createLabelRadioButton = (datalist) => {
    let label = '';
    for (const key in formData) {
      label += `${key} ${datalist[key]} `;
    }
    return label;
  };

  return (
    <Table
      selectRows={true}
      onChange={handleChange}
      selectedValue={formData as RowData}
    >
      <TableHeader>
        <TableRow>
          <TableCell radiobutton={true}></TableCell>
          {renderHeaders(tableHeaders)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {calculatedDataList.map((datalist) => {
          return (
            <TableRow
              key={JSON.stringify(datalist)}
              rowData={rowAsValue(datalist)}
            >
              <TableCell radiobutton={true}>
                <RadioButton
                  name={datalist}
                  onChange={() => {
                    // Intentionally empty to prevent double-selection
                  }}
                  value={rowAsValueString(datalist)}
                  checked={rowAsValueString(datalist) === JSON.stringify(formData) ? true : false}
                  label={createLabelRadioButton(datalist)}
                  hideLabel={true}
                ></RadioButton>
              </TableCell>
              {renderRow(datalist)}
            </TableRow>
          );
        })}
      </TableBody>
      {pagination && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={tableHeaders && 1 + tableHeaders?.length}>
              <Pagination
                numberOfRows={totalItemsCount}
                rowsPerPageOptions={pagination.alternatives}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                currentPage={currentPage}
                setCurrentPage={handleChangeCurrentPage}
                descriptionTexts={getLanguageFromKey('list_component', language)}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};
