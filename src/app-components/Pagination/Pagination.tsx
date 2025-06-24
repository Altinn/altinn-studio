import React from 'react';

import {
  Field,
  Label,
  Pagination as DesignSystemPagination,
  Select,
  usePagination,
} from '@digdir/designsystemet-react';

import classes from 'src/app-components/Pagination/Pagination.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMini, useIsMobile, useIsTablet } from 'src/hooks/useDeviceWidths';

type PaginationProps = {
  nextLabel: string;
  nextLabelAriaLabel: string;
  previousLabel: string;
  previousLabelAriaLabel: string;
  size: NonNullable<Parameters<typeof DesignSystemPagination>[0]['data-size']>;
  compact?: boolean;
  hideLabels?: boolean;
  showRowsPerPageDropdown?: boolean;
  currentPage: number;
  numberOfRows: number;
  pageSize: number;
  rowsPerPageText: string;
  rowsPerPageOptions?: number[];
  onPageSizeChange: (value: number) => void;
  setCurrentPage: (pageNumber: number) => void;
  onChange?: Parameters<typeof DesignSystemPagination>[0]['onChange'];
} & Omit<React.HTMLAttributes<HTMLElement>, 'onChange'>;

export const Pagination = ({
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
  const { langAsString } = useLanguage();

  return (
    <>
      {showRowsPerPageDropdown && !isMobile && (
        <Field className={classes.rowsPerPageField}>
          <Select
            id='paginationRowsPerPageDropdown'
            data-size='sm'
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className={classes.rowsPerPageDropdown}
          >
            {rowsPerPageOptions?.map((option, i) => (
              <Select.Option
                key={`${option}${i}`}
                value={option}
              >
                {option}
              </Select.Option>
            ))}
          </Select>
          <Label htmlFor='paginationRowsPerPageDropdown'>{rowsPerPageText}</Label>
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
                  aria-label={langAsString('general.page_number', [page])}
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
