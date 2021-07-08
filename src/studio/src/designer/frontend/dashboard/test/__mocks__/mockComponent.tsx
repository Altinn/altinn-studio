import * as React from 'react';

export default function mockComponent(name: string): Function {
  return (props: any) => React.createElement(name, props);
}
