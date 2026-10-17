import React, { forwardRef, memo } from 'react';

import { act, render, screen } from '@testing-library/react';

import { CUSTOM_REACT_API_VERSION, registerComponent, useRegisteredComponent } from 'src/features/customReact/registry';
import type { CustomReactComponentProps, RegisterComponentArgs } from 'src/features/customReact/types';

const Dummy = () => <div>dummy</div>;

function register(args: Partial<RegisterComponentArgs>) {
  registerComponent({ name: 'dummy', component: Dummy, apiVersion: CUSTOM_REACT_API_VERSION, ...args });
}

describe('registerComponent', () => {
  it('rejects registrations built for another API version', () => {
    expect(() => register({ name: 'wrong-version', apiVersion: 2 })).toThrow(
      'Cannot register React component "wrong-version": it was built for API version 2, but this app frontend provides API version 1',
    );
  });

  it.each(['', 'MyComponent', 'my_component', 'my--component', '-my-component', 'my-component-', '1-component'])(
    'rejects the invalid name "%s"',
    (name) => {
      expect(() => register({ name })).toThrow('the name must be lowercase words separated by hyphens');
    },
  );

  it('rejects values that are not React components', () => {
    expect(() => register({ name: 'not-a-component', component: 'div' as unknown as typeof Dummy })).toThrow(
      'the component is not a React component',
    );
  });

  it('accepts memo and forwardRef components', () => {
    expect(() => register({ name: 'memo-component', component: memo(Dummy) })).not.toThrow();
    expect(() =>
      register({
        name: 'forward-ref-component',
        component: forwardRef(function Forwarded() {
          return <div />;
        }),
      }),
    ).not.toThrow();
  });

  it('rejects registering the same name twice', () => {
    register({ name: 'duplicate' });
    expect(() => register({ name: 'duplicate' })).toThrow(
      'Cannot register React component "duplicate": a component with this name is already registered',
    );
  });

  it('rejects calls without an object', () => {
    expect(() => registerComponent(undefined as unknown as RegisterComponentArgs)).toThrow(
      'expects an object with name, component and apiVersion',
    );
  });
});

describe('useRegisteredComponent', () => {
  function Consumer({ name }: { name: string }) {
    const Component = useRegisteredComponent(name);
    return Component ? <Component {...({} as CustomReactComponentProps)} /> : <div>not registered</div>;
  }

  it('re-renders when the component is registered after the first render', () => {
    render(<Consumer name='late-component' />);
    expect(screen.getByText('not registered')).toBeInTheDocument();

    act(() => register({ name: 'late-component', component: () => <div>late component</div> }));
    expect(screen.getByText('late component')).toBeInTheDocument();
  });
});
