import React from 'react';

import {
  Field,
  Label,
  Pagination as DesignSystemPagination,
  Select,
  usePagination,
} from '@digdir/designsystemet-react';
import type { UsePaginationProps } from '@digdir/designsystemet-react';

import classes from './Pagination.module.css';

import { useIsMini, useIsMobile, useIsTablet } from 'src/app-components/hooks/useDeviceWidths';

export type PaginationProps = {
  id: string;
  nextLabel: string;
  previousLabel: string;
  size: NonNullable<Parameters<typeof DesignSystemPagination>[0]['data-size']>;
  compact?: boolean;
  hideLabels?: boolean;
  showRowsPerPageDropdown?: boolean;
  currentPage: number;
  numberOfRows: number;
  pageSize: number;
  rowsPerPageText: string;
  rowsPerPageOptions?: number[];
  pageAriaLabelTemplate?: string;
  onPageSizeChange: (value: number) => void;
  setCurrentPage: (pageNumber: number) => void;
} & Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> &
  Pick<UsePaginationProps, 'onChange'>;

export const Pagination = ({
  id,
  nextLabel,
  previousLabel,
  size,
  compact,
  hideLabels,
  currentPage,
  setCurrentPage,
  onChange,
  onPageSizeChange,
  numberOfRows = 0,
  rowsPerPageOptions,
  rowsPerPageText,
  pageAriaLabelTemplate,
  showRowsPerPageDropdown = false,
  pageSize,
}: PaginationProps) => {
  const isMini = useIsMini();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isCompact = compact || isMini || isTablet;

  const totalPages = Math.ceil(numberOfRows / pageSize);
  let showPages = isCompact ? 3 : 5;

  if (showPages > totalPages) {
    showPages = totalPages;
  }

  const { pages, prevButtonProps, nextButtonProps } = usePagination({
    currentPage,
    setCurrentPage,
    totalPages,
    onChange,
    showPages,
  });

  return (
    <>
      {showRowsPerPageDropdown && !isMobile && (
        <Field className={classes.rowsPerPageField}>
          <Select
            id={`paginationRowsPerPageDropdown-${id}`}
            data-size='sm'
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className={classes.rowsPerPageDropdown}
          >
            {rowsPerPageOptions?.map((option, i) => (
              <Select.Option key={`${option}${i}`} value={option}>
                {option}
              </Select.Option>
            ))}
          </Select>
          <Label htmlFor={`paginationRowsPerPageDropdown-${id}`}>{rowsPerPageText}</Label>
        </Field>
      )}
      <DesignSystemPagination
        data-testid='pagination'
        aria-label='Pagination'
        data-size={size}
        className={classes.pagination}
      >
        <DesignSystemPagination.List>
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Button {...prevButtonProps}>
              {!hideLabels && !isMobile && previousLabel}
            </DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
          {pages.map(({ page, itemKey, buttonProps }) => (
            <DesignSystemPagination.Item key={itemKey}>
              {typeof page === 'number' && (
                <DesignSystemPagination.Button
                  aria-current={currentPage === page}
                  aria-label={pageAriaLabelTemplate?.replace('{page}', String(page))}
                  {...buttonProps}
                >
                  {page}
                </DesignSystemPagination.Button>
              )}
            </DesignSystemPagination.Item>
          ))}
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Button {...nextButtonProps}>
              {!hideLabels && !isMobile && nextLabel}
            </DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
        </DesignSystemPagination.List>
      </DesignSystemPagination>
    </>
  );
};
