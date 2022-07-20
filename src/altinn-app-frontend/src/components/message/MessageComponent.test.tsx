import * as React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { MessageComponent } from 'src/components/message/MessageComponent';
import type { IMessageComponentProps } from 'src/components/message/MessageComponent';

describe('MessageComponent', () => {
  it('should have class a-message when messageType is "message", and none of the other a-message-* classes', () => {
    render({ id: 'id', messageType: 'message' });

    const component = screen.getByTestId('message-component-id');

    expect(component).toHaveClass('a-message');
    expect(component).not.toHaveClass('a-message-info');
    expect(component).not.toHaveClass('a-message-error');
    expect(component).not.toHaveClass('a-message-success');
  });

  it('should have class a-message-info when messageType is "info", and none of the other a-message-* classes', () => {
    render({ id: 'id', messageType: 'info' });

    const component = screen.getByTestId('message-component-id');

    expect(component).toHaveClass('a-message');
    expect(component).toHaveClass('a-message-info');
    expect(component).not.toHaveClass('a-message-error');
    expect(component).not.toHaveClass('a-message-success');
  });

  it('should have class a-message-error when messageType is "error", and none of the other a-message-* classes', () => {
    render({ id: 'id', messageType: 'error' });

    const component = screen.getByTestId('message-component-id');

    expect(component).toHaveClass('a-message');
    expect(component).not.toHaveClass('a-message-info');
    expect(component).toHaveClass('a-message-error');
    expect(component).not.toHaveClass('a-message-success');
  });

  it('should have class a-message-success when messageType is "success", and none of the other a-message-* classes', () => {
    render({ id: 'id', messageType: 'success' });

    const component = screen.getByTestId('message-component-id');

    expect(component).toHaveClass('a-message');
    expect(component).not.toHaveClass('a-message-info');
    expect(component).not.toHaveClass('a-message-error');
    expect(component).toHaveClass('a-message-success');
  });

  it('should render "message" when message is supplied, even when children is supplied', () => {
    render({
      message: 'message content',
      children: <div data-testid='should-not-be-present'></div>,
    });

    expect(screen.getByText('message content')).toBeInTheDocument();
    expect(
      screen.queryByTestId('should-not-be-present'),
    ).not.toBeInTheDocument();
  });

  it('should render "children" when children is supplied and no message is supplied', () => {
    render({
      children: <div data-testid='should-be-present'></div>,
    });

    expect(screen.getByTestId('should-be-present')).toBeInTheDocument();
  });
});

const render = (props: Partial<IMessageComponentProps> = {}) => {
  const allProps = {
    messageType: 'message',
    id: 'id',
    children: <div></div>,
    ...props,
  } as IMessageComponentProps;

  rtlRender(<MessageComponent {...allProps}></MessageComponent>);
};
