import * as React from 'react';

export default function mockComponent(name: string): Function {
  return (props: Object) => React.createElement(name, props);
}
