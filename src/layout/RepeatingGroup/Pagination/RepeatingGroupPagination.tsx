import React, { useCallback, useMemo } from 'react';

import { Pagination, Table, usePagination } from '@digdir/designsystemet-react';
import { ChevronLeftIcon, ChevronRightIcon } from '@navikt/aksel-icons';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { useResetScrollPosition } from 'src/core/ui/useResetScrollPosition';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMini, useIsMobile, useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import classes from 'src/layout/RepeatingGroup/Pagination/RepeatingGroupPagination.module.css';
import {
  useRepeatingGroup,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import type { RepGroupRow } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface RepeatingGroupPaginationProps {
  inTable?: boolean;
}

/**
 * Simple wrapper to prevent running any hooks unless pagination is actually going to be used
 * Specifically, usePagesWithErrors and useRowStructure would be doing unecessary work
 */
export function RepeatingGroupPagination(props: RepeatingGroupPaginationProps) {
  const { visibleRows } = useRepeatingGroupRowState();
  const { hasPagination, rowsPerPage } = useRepeatingGroupPagination();

  if (!hasPagination || visibleRows.length <= rowsPerPage) {
    return null;
  }

  return <_RepeatingGroupPagination {...props} />;
}

function _RepeatingGroupPagination({ inTable = true }: RepeatingGroupPaginationProps) {
  const { changePage, node } = useRepeatingGroup();
  const { hasPagination, rowsPerPage, currentPage, totalPages } = useRepeatingGroupPagination();
  const pagesWithErrors = usePagesWithErrors(rowsPerPage, node);
  const isTablet = useIsMobileOrTablet();
  const isMobile = useIsMobile();
  const isMini = useIsMini();
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings || {});

  const getScrollPosition = useCallback(
    () => document.querySelector(`[data-pagination-id="${node.id}"]`)?.getClientRects().item(0)?.y,
    [node],
  );

  /**
   * The last page can have fewer items than the other pages,
   * navigating to or from the last page will cause everything to move.
   * This resets the scroll position so that the buttons are in the same place.
   */
  const resetScrollPosition = useResetScrollPosition(getScrollPosition);

  // Should never be true, but leaving it for type inference
  if (!hasPagination) {
    return null;
  }

  const onChange = async (pageNumber: number) => {
    const prevScrollPosition = getScrollPosition();
    await changePage(pageNumber - 1);
    resetScrollPosition(prevScrollPosition);
  };

  return (
    <ConditionalWrapper
      condition={inTable}
      wrapper={(children) => (
        <Table.Body>
          <Table.Row className={!isTablet ? classes.row : undefined}>
            <Table.Cell colSpan={100}>{children}</Table.Cell>
          </Table.Row>
        </Table.Body>
      )}
    >
      <PaginationComponent
        nextTextKey={textResourceBindings?.pagination_next_button ?? 'general.next'}
        backTextKey={textResourceBindings?.pagination_back_button ?? 'general.back'}
        data-pagination-id={node.id}
        className={classes.pagination}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        pagesWithErrors={pagesWithErrors}
        onChange={onChange}
        compact={isTablet}
        hideLabels={isMobile}
        size={isMini ? 'small' : 'medium'}
      />
    </ConditionalWrapper>
  );
}

type PaginationComponentProps = {
  nextTextKey: string;
  backTextKey: string;
  size: NonNullable<Parameters<typeof Pagination>[0]['size']>;
  compact: boolean;
  hideLabels: boolean;
  currentPage: number;
  totalPages: number;
  pagesWithErrors: number[];
  onChange: Parameters<typeof Pagination>[0]['onChange'];
} & Omit<React.HTMLAttributes<HTMLElement>, 'onChange'>;

const iconSize = {
  small: '1rem',
  medium: '1.5rem',
  large: '2rem',
};

function PaginationComponent({
  nextTextKey,
  backTextKey,
  size,
  compact,
  hideLabels,
  currentPage,
  totalPages,
  pagesWithErrors,
  onChange,
  ...rest
}: PaginationComponentProps) {
  const { pages, showNextPage, showPreviousPage } = usePagination({
    compact,
    currentPage,
    totalPages,
  });
  const { langAsString } = useLanguage();

  const nextLabel = langAsString(nextTextKey);
  const previousLabel = langAsString(backTextKey);

  return (
    <Pagination.Root
      aria-label='Pagination'
      size={size}
      compact={compact}
      {...rest}
    >
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            className={!showPreviousPage ? classes.hidden : undefined}
            onClick={() => {
              onChange(currentPage - 1);
            }}
            aria-label={previousLabel}
          >
            <ChevronLeftIcon
              aria-hidden
              fontSize={iconSize[size]}
            />
            {!hideLabels && previousLabel}
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((page, i) => {
          const hasErrors = typeof page === 'number' && pagesWithErrors.includes(page - 1);
          const label = hasErrors
            ? `${langAsString('general.edit_alt_error')}: ${langAsString('general.page_number', [page])}`
            : langAsString('general.page_number', [page]);

          return (
            <Pagination.Item key={`${page}${i}`}>
              {page === 'ellipsis' ? (
                <Pagination.Ellipsis />
              ) : (
                <Pagination.Button
                  color={hasErrors ? 'danger' : 'first'}
                  aria-current={currentPage === page}
                  isActive={currentPage === page}
                  aria-label={label}
                  onClick={() => {
                    onChange(page);
                  }}
                >
                  {page}
                </Pagination.Button>
              )}
            </Pagination.Item>
          );
        })}
        <Pagination.Item>
          <Pagination.Next
            aria-label={nextLabel}
            onClick={() => {
              onChange(currentPage + 1);
            }}
            className={!showNextPage ? classes.hidden : undefined}
          >
            {!hideLabels && nextLabel}
            <ChevronRightIcon
              aria-hidden
              fontSize={iconSize[size]}
            />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination.Root>
  );
}

/**
 * Returns a list of pagination pages containing errors
 */
function usePagesWithErrors(rowsPerPage: number | undefined, node: LayoutNode<'RepeatingGroup'>) {
  const rows = useNodeItem(node).rows;
  const nodeValidationsSelector = NodesInternal.useValidationsSelector();
  const traversalSelector = useNodeTraversalSelector();

  return useMemo(() => {
    if (typeof rowsPerPage !== 'number') {
      return [];
    }

    const visibleRows: RepGroupRow[] = [];
    for (const row of rows) {
      if (row && !row.groupExpressions?.hiddenRow) {
        visibleRows.push(row);
      }
    }

    const pagesWithErrors: number[] = [];

    for (let i = 0; i < visibleRows.length; i++) {
      const pageNumber = Math.floor(i / rowsPerPage);
      if (pagesWithErrors.includes(pageNumber)) {
        continue;
      }

      const deepNodes = visibleRows[i].items?.flatMap((node) => traversalSelector((t) => t.with(node).flat(), [node]));
      for (const node of deepNodes || []) {
        const validations = nodeValidationsSelector(node, 'visible', 'error');
        if (validations.length > 0) {
          pagesWithErrors.push(pageNumber);
          break;
        }
      }
    }

    return pagesWithErrors;
  }, [nodeValidationsSelector, rows, rowsPerPage, traversalSelector]);
}
