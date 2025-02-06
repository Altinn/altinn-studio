import React from 'react';

import { Combobox, Pagination as DesignSystemPagination, usePagination } from '@digdir/designsystemet-react';
import { ChevronLeftIcon, ChevronRightIcon } from '@navikt/aksel-icons';

import classes from 'src/app-components/Pagination/Pagination.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMini, useIsMobile, useIsTablet } from 'src/hooks/useDeviceWidths';
import { optionSearchFilter } from 'src/utils/options';

type PaginationProps = {
  nextLabel: string;
  nextLabelAriaLabel: string;
  previousLabel: string;
  previousLabelAriaLabel: string;
  size: NonNullable<Parameters<typeof DesignSystemPagination>[0]['size']>;
  compact?: boolean;
  hideLabels?: boolean;
  showRowsPerPageDropdown?: boolean;
  currentPage: number;
  numberOfRows: number;
  pageSize: number;
  rowsPerPageText: string;
  rowsPerPageOptions?: number[];
  onPageSizeChange?: (value: string[]) => void;
  onChange: Parameters<typeof DesignSystemPagination>[0]['onChange'];
} & Omit<React.HTMLAttributes<HTMLElement>, 'onChange'>;

const iconSize = {
  small: '1rem',
  medium: '1.5rem',
  large: '2rem',
};

export const Pagination = ({
  nextLabel,
  nextLabelAriaLabel,
  previousLabel,
  previousLabelAriaLabel,
  size,
  compact,
  hideLabels,
  currentPage,
  onChange,
  onPageSizeChange,
  numberOfRows = 0,
  rowsPerPageOptions,
  rowsPerPageText,
  showRowsPerPageDropdown = false,
  pageSize,
}: PaginationProps) => {
  const totalPages = Math.ceil(numberOfRows / pageSize);
  const pageNumber = currentPage + 1;

  const isMini = useIsMini();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const { pages, showNextPage, showPreviousPage } = usePagination({
    compact: compact || isMini || isTablet,
    currentPage: pageNumber,
    totalPages,
  });
  const { langAsString } = useLanguage();

  return (
    <>
      {showRowsPerPageDropdown && !isMobile && (
        <Combobox
          id='paginationRowsPerPageDropdown'
          data-testid='paginationRowsPerPageDropdown'
          filter={optionSearchFilter}
          size='sm'
          value={[pageSize.toString()]}
          onValueChange={onPageSizeChange}
          label={rowsPerPageText}
          aria-label={rowsPerPageText}
          className={classes.rowsPerPageDropdown}
        >
          <Combobox.Empty>
            <Lang id='form_filler.no_options_found' />
          </Combobox.Empty>
          {rowsPerPageOptions?.map((option, i) => (
            <Combobox.Option
              key={`${option}${i}`}
              value={option.toString()}
              displayValue={option.toString()}
            >
              <span>
                <wbr />
                {option}
              </span>
            </Combobox.Option>
          ))}
        </Combobox>
      )}
      <DesignSystemPagination.Root
        data-testid='pagination'
        aria-label='Pagination'
        size={size}
        compact={compact || isMini || isTablet}
        className={classes.pagination}
      >
        <DesignSystemPagination.Content>
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Previous
              data-testid='paginationPreviousButton'
              className={!showPreviousPage ? classes.hidden : undefined}
              onClick={() => {
                onChange(currentPage - 1);
              }}
              aria-label={previousLabelAriaLabel}
            >
              <ChevronLeftIcon
                aria-hidden
                fontSize={iconSize[size]}
              />
              {!hideLabels && !isMobile && previousLabel}
            </DesignSystemPagination.Previous>
          </DesignSystemPagination.Item>
          {pages.map((page, i) => (
            <DesignSystemPagination.Item key={`${page}${i}`}>
              {page === 'ellipsis' ? (
                <DesignSystemPagination.Ellipsis />
              ) : (
                <DesignSystemPagination.Button
                  color='first'
                  aria-current={pageNumber === page}
                  isActive={pageNumber === page}
                  aria-label={langAsString('general.page_number', [page])}
                  onClick={() => {
                    onChange(page - 1);
                  }}
                >
                  {page}
                </DesignSystemPagination.Button>
              )}
            </DesignSystemPagination.Item>
          ))}
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Next
              data-testid='paginationNextButton'
              aria-label={nextLabelAriaLabel}
              onClick={() => {
                onChange(currentPage + 1);
              }}
              className={!showNextPage ? classes.hidden : undefined}
            >
              {!hideLabels && !isMobile && nextLabel}
              <ChevronRightIcon
                aria-hidden
                fontSize={iconSize[size]}
              />
            </DesignSystemPagination.Next>
          </DesignSystemPagination.Item>
        </DesignSystemPagination.Content>
      </DesignSystemPagination.Root>
    </>
  );
};
