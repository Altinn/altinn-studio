import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyAccordion, type PolicyAccordionProps } from './PolicyAccordion';

const buttonText = 'Test';
const defaultProps = {
  title: buttonText,
  subTitle: '',
};
const childElementText = 'TEST CHILD ELEMENT';

describe('PolicyAccordion', () => {
  it('should show children when expanded', async () => {
    const user = userEvent.setup();

    renderPolicyAccordion();

    const accordionButton = screen.getByRole('button', { name: buttonText });
    await user.click(accordionButton);

    expect(screen.getByText(childElementText)).toBeInTheDocument();
  });
});

const renderPolicyAccordion = (props: Partial<PolicyAccordionProps> = {}) => {
  render(
    <PolicyAccordion {...defaultProps} {...props}>
      <div>{childElementText}</div>
    </PolicyAccordion>,
  );
};
