import { getVisiblePages } from './StudioPaginationUtils';

describe('getVisiblePages', () => {
  it('should return correct pages for first page', () => {
    expect(getVisiblePages(1, 10)).toEqual([1, 2, undefined, 10]);
  });

  it('should return correct pages for middle page', () => {
    expect(getVisiblePages(5, 10)).toEqual([1, undefined, 4, 5, 6, undefined, 10]);
  });

  it('should return correct pages for last page', () => {
    expect(getVisiblePages(10, 10)).toEqual([1, undefined, 9, 10]);
  });

  it('should return all pages when totalPages <= 7', () => {
    expect(getVisiblePages(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
