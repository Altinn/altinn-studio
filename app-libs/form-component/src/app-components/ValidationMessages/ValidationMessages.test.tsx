import { render, screen } from '@testing-library/react';

import { ValidationMessages } from './ValidationMessages';

describe('ValidationMessages', () => {
  it('renders nothing when there are no validations', () => {
    const { container } = render(<ValidationMessages validations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each severity with the correct role and forwards wrapper attributes', () => {
    const { container } = render(
      <ValidationMessages
        id='my-id'
        dataValidation='indexed-id'
        validations={[
          { id: '1', severity: 'error', message: 'An error' },
          { id: '2', severity: 'warning', message: 'A warning' },
          { id: '3', severity: 'info', message: 'Some info' },
          { id: '4', severity: 'success', message: 'Great success' },
        ]}
      />,
    );

    // Every message is rendered
    expect(screen.getByText('An error')).toBeInTheDocument();
    expect(screen.getByText('A warning')).toBeInTheDocument();
    expect(screen.getByText('Some info')).toBeInTheDocument();
    expect(screen.getByText('Great success')).toBeInTheDocument();

    // The id and data-validation props are forwarded onto the aria-live wrapper
    const wrapper = container.querySelector('#my-id');
    expect(wrapper).toHaveAttribute('data-validation', 'indexed-id');
    expect(wrapper).toHaveAttribute('aria-live', 'assertive');
  });
});
