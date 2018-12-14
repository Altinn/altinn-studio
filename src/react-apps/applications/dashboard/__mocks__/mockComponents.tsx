import * as React from 'react';

// tslint:disable-next-line:ban-types
export default function mockComponent(name: string): Function {
  return (props: any) => React.createElement(name, props);
}
