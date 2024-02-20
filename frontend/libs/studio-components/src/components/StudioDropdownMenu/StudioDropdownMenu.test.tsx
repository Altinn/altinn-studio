import { act, render, screen } from '@testing-library/react';
import { StudioDropdownMenu } from './';
import React, { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

describe('StudioDropdownMenu', () => {
  it('Displays a dropdown menu when the button is clicked', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await openDropdown(user);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Renders all headings', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    expect(screen.getByRole('heading', { name: group1Heading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: group2Heading })).toBeInTheDocument();
  });

  it('Renders all menu items', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    expect(screen.getByRole('menuitem', { name: group1Item1Text })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: group1Item2Text })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: group2Item1Text })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: group2Item2Text })).toBeInTheDocument();
  });

  it('Calls the onClick function and closes the dialog when an item is clicked', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    await act(() => user.click(screen.getByRole('menuitem', { name: group1Item1Text })));
    expect(group1Item1Action).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Renders all icons', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    expect(screen.getByTestId(icon1TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon2TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon3TestId)).toBeInTheDocument();
  });

  it('Closes the dialog when clicking outside', async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(() => user.click(document.body));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("Forwards the items' ref object to the respective items", async () => {
    const user = userEvent.setup();
    renderTestDropdownMenu();
    await openDropdown(user);
    const referredElement = screen.getByRole('menuitem', { name: group1Item2Text });
    expect(referredElement).toBe(group1Item2Ref.current);
  });

  const openDropdown = (user: UserEvent) =>
    act(() => user.click(screen.getByRole('button', { name: buttonLabel })));
});

const buttonLabel = 'Open';
const group1Heading = 'Group 1';
const group2Heading = 'Group 2';
const group1Item1Text = 'Group 1 Item 1';
const group1Item2Text = 'Group 1 Item 2';
const group2Item1Text = 'Group 2 Item 1';
const group2Item2Text = 'Group 2 Item 2';
const group2Item3Text = 'Group 2 Item 3';
const group1Item1Action = jest.fn();
const icon1TestId = 'Icon 1';
const icon2TestId = 'Icon 2';
const icon3TestId = 'Icon 3';
const icon1 = <span data-testid={icon1TestId} />;
const icon2 = <span data-testid={icon2TestId} />;
const icon3 = <span data-testid={icon3TestId} />;
const group1Item2Ref = createRef<HTMLButtonElement>();

const renderTestDropdownMenu = () =>
  render(
    <StudioDropdownMenu anchorButtonProps={{ children: buttonLabel }}>
      <StudioDropdownMenu.Group heading={group1Heading}>
        <StudioDropdownMenu.Item onClick={group1Item1Action}>
          {group1Item1Text}
        </StudioDropdownMenu.Item>
        <StudioDropdownMenu.Item ref={group1Item2Ref}>{group1Item2Text}</StudioDropdownMenu.Item>
      </StudioDropdownMenu.Group>
      <StudioDropdownMenu.Group heading={group2Heading}>
        <StudioDropdownMenu.Item icon={icon1}>{group2Item1Text}</StudioDropdownMenu.Item>
        <StudioDropdownMenu.Item icon={icon2} iconPlacement='left'>
          {group2Item2Text}
        </StudioDropdownMenu.Item>
        <StudioDropdownMenu.Item icon={icon3} iconPlacement='right'>
          {group2Item3Text}
        </StudioDropdownMenu.Item>
      </StudioDropdownMenu.Group>
    </StudioDropdownMenu>,
  );
