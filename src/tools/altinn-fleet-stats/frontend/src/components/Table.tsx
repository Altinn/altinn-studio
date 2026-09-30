import { ReactNode } from 'react';
import { Table as DSTable } from '@digdir/designsystemet-react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeletons';

type Col<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
};

type Props<T> = {
  rows: T[];
  cols: Col<T>[];
  onRowClick?: (r: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
};

export function Table<T extends object>({
  rows,
  cols,
  onRowClick,
  loading,
  emptyTitle = 'Ingen treff',
  emptyDescription,
  emptyAction,
}: Props<T>) {
  if (loading) {
    return <TableSkeleton rows={6} cols={cols.length} />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState compact title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <DSTable data-size='sm' zebra>
      <DSTable.Head>
        <DSTable.Row>
          {cols.map((c) => (
            <DSTable.HeaderCell key={String(c.key)} align={c.align ?? 'left'}>
              {c.header}
            </DSTable.HeaderCell>
          ))}
        </DSTable.Row>
      </DSTable.Head>
      <DSTable.Body>
        {rows.map((r, i) => (
          <DSTable.Row
            key={i}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {cols.map((c) => (
              <DSTable.Cell key={String(c.key)} align={c.align ?? 'left'}>
                {c.render ? c.render(r) : String(r[c.key] ?? '')}
              </DSTable.Cell>
            ))}
          </DSTable.Row>
        ))}
      </DSTable.Body>
    </DSTable>
  );
}
