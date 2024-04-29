import React, { forwardRef } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';

export type Rows = Record<string, React.ReactNode>[];

type PaginationTranslation = {
  nextButtonText: string;
  previousButtonText: string;
  itemLabel: (num: number) => string;
};

type StudioTableWithPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  isSortable?: boolean;
  size?: 'small' | 'medium' | 'large';
  pagination?: {
    initialRowsPerPage?: number;
    paginationTranslation: PaginationTranslation;
  };
};

export const StudioTableLocalPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, isSortable = true, size = 'medium', pagination }, ref): React.ReactElement => {
  return <StudioTableRemotePagination columns={columns} rows={rows} />;
});
