import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedSubjectsList } from './SelectedSubjectsList';

const items = [
  {
    legacyUrn: 'urn:altinn:rolecode:revisor',
    urn: 'urn:altinn:external-role:ccr:revisor',
    title: 'Revisor',
  },
  {
    legacyUrn: 'urn:altinn:rolecode:skatt',
    urn: 'urn:altinn:external-role:ccr:skatt',
    title: 'Skatt',
  },
];

const handleRemove = jest.fn();
const title = 'Chosen roles';

describe('SelectedSubjectsList', () => {
  afterEach(jest.clearAllMocks);

  it('should display list items', async () => {
    renderSelectedSubjectsList();

    expect(screen.getByText(items[0].title)).toBeInTheDocument();
    expect(screen.getByText(items[1].title)).toBeInTheDocument();
  });

  it('should not render if list is empty', async () => {
    renderSelectedSubjectsList([]);

    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('should call handleRemove when list item checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderSelectedSubjectsList();

    const checkbox = screen.getByLabelText(items[0].title);
    await user.click(checkbox);

    expect(handleRemove).toHaveBeenCalledWith(items[0].urn, items[0].legacyUrn);
  });
});

const renderSelectedSubjectsList = (
  listItems: { legacyUrn: string; urn: string; title: string }[] = items,
) => {
  return render(
    <SelectedSubjectsList
      items={listItems}
      title={title}
      icon={null}
      handleRemove={handleRemove}
    />,
  );
};
