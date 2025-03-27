import { render, screen } from '@testing-library/react';
import { StudioDropdown, type StudioDropdownProps } from './';
import React from 'react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

describe('StudioDropdown', () => {
  beforeEach(jest.clearAllMocks);

  it('Displays a dropdown menu when the button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
    await openDropdown(user);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('Renders all headings', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(screen.getByRole('heading', { name: list1Heading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: list2Heading })).toBeInTheDocument();
  });

  it('Renders all menu items', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(getButton(list1Item1Text)).toBeInTheDocument();
    expect(getButton(list2Item1Text)).toBeInTheDocument();
    expect(getButton(list2Item2Text)).toBeInTheDocument();
  });

  it('Calls the onClick function and closes the dialog when an item is clicked', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    await user.click(getButton(list1Item1Text));
    expect(list1Item1Action).toHaveBeenCalled();
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('Renders all icons', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(screen.getByTestId(icon1TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon2TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon3TestId)).toBeInTheDocument();
  });

  it('Closes the dialog when clicking outside', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(document.body);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
  });

  const openDropdown = (user: UserEvent) =>
    user.click(screen.getByRole('button', { name: triggerButtonText }));
});

const triggerButtonText = 'Open';
const list1Heading = 'Group 1';
const list2Heading = 'Group 2';
const list1Item1Text = 'Group 1 Item 1';
const list2Item1Text = 'Group 2 Item 1';
const list2Item2Text = 'Group 2 Item 2';
const list2Item3Text = 'Group 2 Item 3';
const list1Item1Action = jest.fn();
const icon1TestId = 'Icon 1';
const icon2TestId = 'Icon 2';
const icon3TestId = 'Icon 3';
const icon1 = <span data-testid={icon1TestId} />;
const icon2 = <span data-testid={icon2TestId} />;
const icon3 = <span data-testid={icon3TestId} />;

const renderStudioDropdown = (props?: Partial<StudioDropdownProps>) => {
  return render(
    <StudioDropdown triggerButtonText={triggerButtonText}>
      <StudioDropdown.List>
        <StudioDropdown.Heading>{list1Heading}</StudioDropdown.Heading>
        <StudioDropdown.Item>
          <StudioDropdown.Button onClick={list1Item1Action}>{list1Item1Text}</StudioDropdown.Button>
        </StudioDropdown.Item>
      </StudioDropdown.List>
      <StudioDropdown.List>
        <StudioDropdown.Heading>{list2Heading}</StudioDropdown.Heading>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon1}>{list2Item1Text}</StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon2} iconPlacement='left'>
            {list2Item2Text}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon3} iconPlacement='right'>
            {list2Item3Text}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>,
  );
};

const getButton = (name: string) => screen.getByRole('button', { name });
