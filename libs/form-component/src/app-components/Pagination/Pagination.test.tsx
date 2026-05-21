import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Pagination } from './Pagination';

type Props = React.ComponentProps<typeof Pagination>;

const defaultProps: Props = {
  id: 'p1',
  nextLabel: 'Next',
  previousLabel: 'Previous',
  rowsPerPageText: 'Rows per page',
  size: 'sm',
  currentPage: 1,
  numberOfRows: 30,
  pageSize: 10,
  rowsPerPageOptions: [10, 25, 50],
  onPageSizeChange: () => {},
  setCurrentPage: () => {},
};

describe('Pagination', () => {
  it('renders next and previous labels', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
  });

  it('hides next and previous labels when hideLabels is true', () => {
    render(<Pagination {...defaultProps} currentPage={2} hideLabels />);

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  });

  it('renders a page button for each visible page', () => {
    render(<Pagination {...defaultProps} />);

    const nav = screen.getByTestId('pagination');
    expect(within(nav).getByRole('button', { name: /^1$/ })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^2$/ })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /^3$/ })).toBeInTheDocument();
  });

  it('marks the current page with aria-current', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    const nav = screen.getByTestId('pagination');
    expect(within(nav).getByRole('button', { name: /^2$/ })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: /^1$/ })).not.toHaveAttribute('aria-current', 'page');
  });

  it('substitutes {page} in pageAriaLabelTemplate per page', () => {
    render(<Pagination {...defaultProps} pageAriaLabelTemplate='Page {page}' />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
  });

  it('calls setCurrentPage when a page button is clicked', async () => {
    const setCurrentPage = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} setCurrentPage={setCurrentPage} />);

    await user.click(screen.getByRole('button', { name: /^2$/ }));

    expect(setCurrentPage).toHaveBeenCalledWith(2);
  });

  it('does not render the rows-per-page dropdown by default', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument();
  });

  it('renders the rows-per-page dropdown and label when showRowsPerPageDropdown is true', () => {
    render(<Pagination {...defaultProps} showRowsPerPageDropdown />);

    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument();
  });

  it('calls onPageSizeChange with the selected page size', async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination {...defaultProps} showRowsPerPageDropdown onPageSizeChange={onPageSizeChange} />,
    );

    await user.selectOptions(screen.getByLabelText('Rows per page'), '25');

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});
