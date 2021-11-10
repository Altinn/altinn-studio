
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import MessageComponent, { MessageType } from '../../../src/components/message/MessageComponent';

describe('>>> components/message/MessageComponent.tsx', () => {
  let mockId: string;
  let mockMessageType: MessageType;
  let mockMessages: string[];

  beforeEach(() => {
    mockId = 'mockId';
    mockMessageType = 'message';
    mockMessages = ['this is a message'];
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <MessageComponent
        messageType={mockMessageType}
        style={{ display: 'block', width: 'fit-content' }}
        key={'messageType'}
        id={mockId}
      >
        <ol>
          {mockMessages.map((message: string, idx: number) => {
            return (
              <li key={idx}>{message}</li>
            );
          })}
        </ol>
      </MessageComponent>);
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should have class a-message-info when into type', () => {
    mockMessageType = 'info';
    const shallowMessageComponent = shallow(
      <MessageComponent
        messageType={mockMessageType}
        style={{ display: 'block', width: 'fit-content' }}
        key={'messageType'}
        id={mockId}
      >
        <ol>
          {mockMessages.map((message: string, idx: number) => {
            return (
              <li key={idx}>{message}</li>
            );
          })}
        </ol>
      </MessageComponent>);
    expect(shallowMessageComponent.find('div').hasClass('a-message-info')).toBe(true);
  });
  it('+++ should have class a-message-error when error type', () => {
    mockMessageType = 'error';
    const shallowMessageComponent = shallow(
      <MessageComponent
        messageType={mockMessageType}
        style={{ display: 'block', width: 'fit-content' }}
        key={'messageType'}
        id={mockId}
      >
        <ol>
          {mockMessages.map((message: string, idx: number) => {
            return (
              <li key={idx}>{message}</li>
            );
          })}
        </ol>
      </MessageComponent>,
    );
    expect(shallowMessageComponent.find('div').hasClass('a-message-error')).toBe(true);
  });
  it('+++ should have class a-message-success when success type', () => {
    mockMessageType = 'success';
    const shallowMessageComponent = shallow(
      <MessageComponent
        messageType={mockMessageType}
        style={{ display: 'block', width: 'fit-content' }}
        key={'messageType'}
        id={mockId}
      >
        <ol>
          {mockMessages.map((message: string, idx: number) => {
            return (
              <li key={idx}>{message}</li>
            );
          })}
        </ol>
      </MessageComponent>,
    );
    expect(shallowMessageComponent.find('div').hasClass('a-message-success')).toBe(true);
  });
});
