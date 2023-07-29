import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Accordion } from '..';

import type { AccordionHeaderProps } from './AccordionHeader';

const user = userEvent.setup();

const TestComponent = ({
  ...rest
}: Omit<AccordionHeaderProps, 'children'>): JSX.Element => {
  return (
    <Accordion>
      <Accordion.Item>
        <Accordion.Header {...rest}>
          Accordion Header Title Text
        </Accordion.Header>
        <Accordion.Content>
          The Fantastic AccordionContent Text
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};

describe('AccordionHeader Rendering', () => {
  test('should render with aria-expanded false by default', () => {
    render(<TestComponent />);
    const accordionHeaderButton = screen.getByRole('button');

    expect(accordionHeaderButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('should render heading', () => {
    render(<TestComponent />);

    expect(
      screen.getByRole('button', {
        name: 'Accordion Header Title Text',
      }),
    );
  });

  test('should have onClick callback', async () => {
    const onClickMock = jest.fn();
    render(<TestComponent onClick={onClickMock} />);

    const accordionHeaderButton = screen.getByRole('button');
    await act(() => user.click(accordionHeaderButton));

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
