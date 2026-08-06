import { redirect } from 'react-router';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { clientLoader } from 'src/routes/index/stateless-index.loader';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

// react-router's redirect() requires the Fetch API Response class, which jsdom doesn't provide.
// We mock it to return a plain object with the same shape.
vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string) => ({ status: 302, headers: new Map([['Location', url]]) })),
}));

/**
 * The entry point doubles as the id of the ui folder holding the page order. `stateless` is one of the
 * folders in the default ui config mock, and its first page is `page1`.
 */
function setEntryPoint(show: string) {
  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({ onEntry: { show } });
}

function createLoaderArgs(url: string = 'http://localhost/') {
  return createLoaderFunctionArgs({ request: new Request(url) });
}

describe('stateless-index clientLoader', () => {
  it('should not redirect when the app is not stateless', () => {
    setEntryPoint('new-instance');

    expect(clientLoader(createLoaderArgs())).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should redirect to the first page of the entry point folder', () => {
    setEntryPoint('stateless');

    clientLoader(createLoaderArgs());

    expect(redirect).toHaveBeenCalledWith('/page1');
  });

  it('should preserve query parameters when redirecting', () => {
    setEntryPoint('stateless');

    clientLoader(createLoaderArgs('http://localhost/?language=nb'));

    expect(redirect).toHaveBeenCalledWith('/page1?language=nb');
  });

  it('should throw when the entry point folder has no pages', () => {
    setEntryPoint('folder-that-does-not-exist');

    expect(() => clientLoader(createLoaderArgs())).toThrow(
      'Cannot determine start page for stateless app (folderId=folder-that-does-not-exist)',
    );
  });
});
