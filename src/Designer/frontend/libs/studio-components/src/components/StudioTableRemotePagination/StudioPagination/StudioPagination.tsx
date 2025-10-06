import React from 'react';
import { Pagination } from '@digdir/designsystemet-react';

export type StudioPaginationProps = {
  currentPage: number;
  totalPages: number;
  previousButtonAriaLabel?: string;
  nextButtonAriaLabel?: string;
  numberButtonAriaLabel?: (num: number) => string;
  onChange: (page: number) => void;
};

export function StudioPagination({
  currentPage,
  totalPages,
  previousButtonAriaLabel,
  nextButtonAriaLabel,
  numberButtonAriaLabel,
  onChange,
}: StudioPaginationProps): React.ReactElement {
  const safeCurrent = currentPage || 1;
  const safeTotal = totalPages || 1;

  return (
    <Pagination aria-label='Pagination'>
      <Pagination.List>
        <Pagination.Item hidden={safeCurrent <= 1}>
          <Pagination.Button
            aria-label={previousButtonAriaLabel ?? 'Previous'}
            variant='tertiary'
            onClick={() => onChange(Math.max(1, safeCurrent - 1))}
          ></Pagination.Button>
        </Pagination.Item>
        {Array.from({ length: safeTotal }, (_, index) => index + 1).map((pageNumber) => (
          <Pagination.Item key={pageNumber}>
            <Pagination.Button
              aria-label={numberButtonAriaLabel?.(pageNumber)}
              aria-current={pageNumber === safeCurrent ? 'page' : undefined}
              variant={pageNumber === safeCurrent ? undefined : 'tertiary'}
              onClick={() => onChange(pageNumber)}
            >
              {pageNumber}
            </Pagination.Button>
          </Pagination.Item>
        ))}
        <Pagination.Item hidden={safeCurrent >= safeTotal}>
          <Pagination.Button
            aria-label={nextButtonAriaLabel ?? 'Next'}
            variant='tertiary'
            onClick={() => onChange(Math.min(safeTotal, safeCurrent + 1))}
          ></Pagination.Button>
        </Pagination.Item>
      </Pagination.List>
    </Pagination>
  );
}
