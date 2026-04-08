import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ActionsCell } from './ActionsCell';
import { StudioTable } from '@studio/components';

const defaultProps = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  editAriaLabel: 'Edit',
  itemName: 'Test item',
};

const renderActionsCell = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(
    <StudioTable>
      <StudioTable.Body>
        <StudioTable.Row>
          <ActionsCell {...defaultProps} {...props} />
        </StudioTable.Row>
      </StudioTable.Body>
    </StudioTable>,
  );

const getDeleteButton = () =>
  screen.getByRole('button', {
    name: textMock('settings.orgs.contact_points.delete', { name: defaultProps.itemName }),
  });

describe('ActionsCell', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    renderActionsCell({ onEdit });
    await user.click(screen.getByRole('button', { name: defaultProps.editAriaLabel }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = jest.fn();
    renderActionsCell({ onDelete });
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('does not call onDelete when delete is cancelled', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = jest.fn();
    renderActionsCell({ onDelete });
    await user.click(getDeleteButton());
    expect(onDelete).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
