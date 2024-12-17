import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyAccordion } from './PolicyAccordion';

describe('PolicyAccordion', () => {
  it('should show children when expanded', async () => {
    const user = userEvent.setup();
    const childElementText = 'TEST CHILD ELEMENT';
    render(
      <PolicyAccordion icon='TruckIcon' title='Test' subTitle='SubTest'>
        <div>{childElementText}</div>
      </PolicyAccordion>,
    );

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(screen.getByText(childElementText)).toBeInTheDocument();
  });
});
