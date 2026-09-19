import type { IGridSize, IGridStyling } from '@app/layout-contract/generated/common.generated';

/** Grid values supported by Designer's current grid selector. */
export type GridSizes = Partial<Record<keyof IGridStyling, Exclude<IGridSize, 'auto'>>>;
