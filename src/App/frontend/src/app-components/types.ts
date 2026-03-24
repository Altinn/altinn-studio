export type TranslationKey = string & { __brand: 'TranslationKey' };

export type LooseAutocomplete<T extends string> = T | (string & {}); // NOSONAR

export type IGridSize = 'auto' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface IGridStyling {
  xs?: IGridSize;
  sm?: IGridSize;
  md?: IGridSize;
  lg?: IGridSize;
  xl?: IGridSize;
}
