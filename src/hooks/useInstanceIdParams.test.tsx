import React from 'react';
import { Route, useLocation } from 'react-router-dom';

import { render, screen } from '@testing-library/react';

import { instanceIdExample } from 'src/__mocks__/mocks';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { MemoryRouterWithRedirectingRoot } from 'src/testUtils';

const TestComponent = () => {
  const { instanceId, partyId, instanceGuid } = useInstanceIdParams();
  const location = useLocation();
  return (
    <>
      <p>Location: {location.pathname}</p>
      <div>
        {instanceId || 'no'} {partyId || 'instance'} {instanceGuid || 'id'}
      </div>
    </>
  );
};
describe('useInstanceIdParams', () => {
  function renderRoutes(navPath: string) {
    return render(
      <main>
        <h1>Param test</h1>
        <MemoryRouterWithRedirectingRoot to={navPath}>
          <Route
            path={'/*'}
            element={<TestComponent />}
          />
        </MemoryRouterWithRedirectingRoot>
      </main>,
    );
  }

  it('should not find params when there is no instance', () => {
    const pathname = 'someOtherPath/someOtherPage/inSomeOtherPlace';
    renderRoutes(pathname);
    expect(screen.getByText(`Location: /${pathname}`)).toBeInTheDocument();
    expect(screen.getByText('no instance id')).toBeInTheDocument();
  });

  it('should find params when "instance/" is in the url and it is valid', () => {
    const pathname = `/instance/${instanceIdExample}`;
    renderRoutes(pathname);
    const [a, b] = instanceIdExample.split('/');
    expect(screen.getByText(`Location: ${pathname}`)).toBeInTheDocument();
    expect(screen.getByText(`${instanceIdExample} ${a} ${b}`)).toBeInTheDocument();
  });

  it('should find params when "instance/" is in the url and it is valid and on a sub-page', () => {
    const pathname = `/instance/${instanceIdExample}/page-2`;
    renderRoutes(pathname);
    const [a, b] = instanceIdExample.split('/');
    expect(screen.getByText(`Location: ${pathname}`)).toBeInTheDocument();
    expect(screen.getByText(`${instanceIdExample} ${a} ${b}`)).toBeInTheDocument();
  });
});
