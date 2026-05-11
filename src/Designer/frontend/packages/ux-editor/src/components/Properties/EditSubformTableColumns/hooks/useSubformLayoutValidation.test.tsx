import { useSubformLayoutValidation } from './useSubformLayoutValidation';
import { renderHookWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';

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
      component2: componentMocks.Input,
    },
  },
};

const excludedLayout: IFormLayouts = {
  ...emptyLayout,
  page1: {
    ...emptyLayout.page1,
    components: {
      component2: componentMocks.CustomButton,
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

  it('should return false if form layout has only excluded components', () => {
    const { result } = renderHook({
      layout: excludedLayout,
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
