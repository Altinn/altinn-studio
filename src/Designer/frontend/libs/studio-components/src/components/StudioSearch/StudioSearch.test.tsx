import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioSearch, type StudioSearchProps } from './StudioSearch';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioSearch', () => {
  it('renders search input with label', () => {
    renderStudioSearch();
    const searchInput = screen.getByRole('searchbox', { name: 'Search' });
    expect(searchInput).toBeInTheDocument();
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderStudioSearch({}, ref), getSearchBox);
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderStudioSearch({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes(renderStudioSearch, getSearchBox);
  });

  it('should apply custom data-size to label and input', () => {
    renderStudioSearch({ 'data-size': 'sm' });
    expect(screen.getByText('Search')).toHaveAttribute('data-size', 'sm');
    expect(getSearchBox()).toHaveAttribute('data-size', 'sm');
  });

  it('should render search field with label name when ID is set through props', () => {
    const label = 'Search for something';
    const id = 'searchId';
    renderStudioSearch({ label, id });
    const search = screen.getByRole('searchbox', { name: label });
    expect(search).toBeInTheDocument();
  });

  it('should not render an error message nor mark the search box as invalid by default', () => {
    renderStudioSearch();
    expect(getSearchBox()).not.toHaveAttribute('aria-invalid');
  });

  it('should render the error message and mark the search box as invalid when error is set', () => {
    const error = 'Invalid search term';
    renderStudioSearch({ error });
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(getSearchBox()).toHaveAttribute('aria-invalid', 'true');
    expect(getSearchBox()).toHaveAccessibleDescription(error);
  });

  it('should keep a description given through props when error is set', () => {
    const error = 'Invalid search term';
    const description = 'Search by name';
    render(
      <>
        <span id='description'>{description}</span>
        <StudioSearch {...defaultProps} error={error} aria-describedby='description' />
      </>,
    );
    expect(getSearchBox()).toHaveAccessibleDescription(`${description} ${error}`);
  });

  it('should not render a search button when onSearchClick is not set', () => {
    renderStudioSearch({ searchButtonLabel: 'Search' });
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('should call onSearchClick when the search button is clicked', async () => {
    const user = userEvent.setup();
    const searchButtonLabel = 'Search';
    const onSearchClick = jest.fn();
    renderStudioSearch({ searchButtonLabel, onSearchClick });
    await user.click(screen.getByRole('button', { name: searchButtonLabel }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);
  });

  const defaultProps: StudioSearchProps = {
    label: 'Search',
    clearButtonLabel: 'Clear search',
  };

  const renderStudioSearch = (
    props: Partial<StudioSearchProps> = {},
    ref?: ForwardedRef<HTMLInputElement>,
  ): RenderResult => {
    return render(<StudioSearch {...defaultProps} {...props} ref={ref} />);
  };

  function getSearchBox(): HTMLInputElement {
    return screen.getByRole('searchbox');
  }
});
