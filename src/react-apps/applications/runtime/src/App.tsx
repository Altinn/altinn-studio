import * as React from 'react';
import ErrorBoundry from './errorHandler/ErrorHandler';

const Counter = React.lazy(() => import(/* webpackChunkName: "Counter" */'./Counter'));

export default () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <ErrorBoundry>
      <React.Suspense fallback={<h4>Loading</h4>}>
        <Counter />
      </React.Suspense>
    </ErrorBoundry>
  </div>
);