import { useSubformLayoutValidation } from './useSubformLayoutValidation';
import { renderHookWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { ComponentType } from 'app-shared/types/ComponentType';

const emptyLayout: IFormLayouts = {
  page1: {
    order: {
      section1: ['component2'],
    },
    components: {},
    containers: {},
    customRootProperties: {},
    customDataProperties: {},
  },
};

const nonEmptyLayout: IFormLayouts = {
  ...emptyLayout,
  page1: {
    ...emptyLayout.page1,
    components: {
      component2: {
        type: ComponentType.Input,
        id: 'component2',
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: 'simpleBinding' },
      },
    },
  },
};

describe('useSubformLayoutValidation', () => {
  it('should return true if form layout has components', () => {
    const { result } = renderHook({
      layout: nonEmptyLayout,
    });
    expect(result.current).toBe(true);
  });
  it('should return false if form layout has no components', () => {
    const { result } = renderHook({
      layout: emptyLayout,
    });
    expect(result.current).toBe(false);
  });
});

type renderHookArgs = {
  layout: IFormLayouts;
};

const renderHook = ({ layout }: renderHookArgs) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, ''], layout);
  return renderHookWithProviders(() => useSubformLayoutValidation(''), {
    queryClient: queryClient,
  });
};
