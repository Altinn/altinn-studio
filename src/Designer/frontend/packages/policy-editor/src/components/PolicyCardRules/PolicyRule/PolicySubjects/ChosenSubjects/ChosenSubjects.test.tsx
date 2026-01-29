import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ChosenSubjects } from './ChosenSubjects';

describe('ChosenSubjects', () => {
  it('returns null when there are no items', () => {
    const testHeading = 'testHeading';
    render(
      <ChosenSubjects groups={[{ heading: testHeading, handleRemove: jest.fn(), items: [] }]} />,
    );
    expect(screen.queryByText(testHeading)).not.toBeInTheDocument();
  });

  it('renders person heading and items when isPersonSubject is true', () => {
    const itemLabel = 'PersonItem';
    const groups = [
      { heading: 'Person', handleRemove: jest.fn(), items: [{ urn: 'u1', label: itemLabel }] },
      { heading: 'Person2', handleRemove: jest.fn(), items: [{ urn: 'u2', label: 'item2' }] },
    ];

    render(<ChosenSubjects groups={groups} isPersonSubject />);

    expect(screen.getByText(textMock('policy_editor.person_subjects_header'))).toBeInTheDocument();
    expect(screen.getByText(itemLabel)).toBeInTheDocument();
  });

  it('sorts groups by length and items by label', () => {
    const DOCUMENT_POSITION_FOLLOWING = 4;

    const groups = [
      {
        heading: 'Group A',
        handleRemove: jest.fn(),
        items: [
          { urn: 'u2', label: 'Banana' },
          { urn: 'u1', label: 'Apple' },
        ],
      },
      { heading: 'Group B', handleRemove: jest.fn(), items: [{ urn: 'u3', label: 'Cherry' }] },
      { heading: 'Group C', handleRemove: jest.fn(), items: [{ urn: 'u4', label: 'Lemon' }] },
    ];

    render(<ChosenSubjects groups={groups} />);

    expect(screen.getByText(textMock('policy_editor.org_subjects_header'))).toBeInTheDocument();

    const apple = screen.getByText('Apple');
    const banana = screen.getByText('Banana');
    const cherry = screen.getByText('Cherry');

    expect(apple.compareDocumentPosition(banana)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(cherry.compareDocumentPosition(apple)).toBe(DOCUMENT_POSITION_FOLLOWING);
  });

  it('calls handleRemove when checkbox is unchecked', async () => {
    const user = userEvent.setup();

    const handleRemoveMock = jest.fn();
    const groups = [
      {
        heading: 'Group A',
        handleRemove: handleRemoveMock,
        items: [
          { urn: 'u2', label: 'Banana' },
          { urn: 'u1', label: 'Apple' },
        ],
      },
    ];
    render(<ChosenSubjects groups={groups} />);

    await user.click(screen.getByRole('checkbox', { name: 'Banana' }));

    expect(handleRemoveMock).toHaveBeenCalledWith('u2', undefined);
  });
});
