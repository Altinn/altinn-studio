import { useImportCodeListFromOrgToAppMutation } from './useImportCodeListFromOrgToAppMutation';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { org, app } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const codeListId: string = 'testCodeListId';

describe('useImportCodeListFromOrgToAppMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('should call importCodeListFromOrgToApp with correct parameters', async () => {
    const { result } = renderHookWithProviders(() =>
      useImportCodeListFromOrgToAppMutation(org, app, codeListId),
    );
    await result.current.mutateAsync();
    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledTimes(1);
    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledWith(org, app, codeListId);
  });
});
