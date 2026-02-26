import React from 'react';

import {
  Field,
  Label,
  Pagination as DesignSystemPagination,
  Select,
  usePagination,
} from '@digdir/designsystemet-react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import { useIsMini, useIsMobile, useIsTablet } from 'src/app-components/hooks/useDeviceWidths';
import classes from 'src/app-components/Pagination/Pagination.module.css';
import type { TranslationKey } from 'src/app-components/types';

type PaginationProps = {
  id: string;
  nextLabel: TranslationKey;
  previousLabel: TranslationKey;
  size: NonNullable<Parameters<typeof DesignSystemPagination>[0]['data-size']>;
  compact?: boolean;
  hideLabels?: boolean;
  showRowsPerPageDropdown?: boolean;
  currentPage: number;
  numberOfRows: number;
  pageSize: number;
  rowsPerPageText: TranslationKey;
  rowsPerPageOptions?: number[];
  onPageSizeChange: (value: number) => void;
  setCurrentPage: (pageNumber: number) => void;
  onChange?: Parameters<typeof DesignSystemPagination>[0]['onChange'];
} & Omit<React.HTMLAttributes<HTMLElement>, 'onChange'>;

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
  const { translate } = useTranslation();

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
              <Select.Option
                key={`${option}${i}`}
                value={option}
              >
                {option}
              </Select.Option>
            ))}
          </Select>
          <Label htmlFor={`paginationRowsPerPageDropdown-${id}`}>{translate(rowsPerPageText)}</Label>
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
              {!hideLabels && !isMobile && translate(previousLabel)}
            </DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
          {pages.map(({ page, itemKey, buttonProps }) => (
            <DesignSystemPagination.Item key={itemKey}>
              {typeof page === 'number' && (
                <DesignSystemPagination.Button
                  aria-current={currentPage === page}
                  aria-label={translate('general.page_number', [page])}
                  {...buttonProps}
                >
                  {page}
                </DesignSystemPagination.Button>
              )}
            </DesignSystemPagination.Item>
          ))}
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Button {...nextButtonProps}>
              {!hideLabels && !isMobile && translate(nextLabel)}
            </DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
        </DesignSystemPagination.List>
      </DesignSystemPagination>
    </>
  );
};
