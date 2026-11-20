import { renderHook } from '@testing-library/react';

import { useGetNavigationIsPrevented } from 'src/features/navigation/utils';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { emptyBreakdown } from 'src/features/validation/deriveValidationState';
import type { ValidationCategory, ValidationSeverity } from 'src/features/validation';
import type { DerivedValidationState } from 'src/features/validation/deriveValidationState';
import type { ILayoutCollection } from 'src/layout/layout';

const mocks = vi.hoisted(() => ({
  currentPage: 'First',
  order: ['First', 'Middle', 'Later', 'Last'],
  layouts: {} as ILayoutCollection,
  globalValidation: undefined as undefined | { show: ('Required' | 'Schema')[] },
  derive: vi.fn<() => DerivedValidationState>(),
}));

vi.mock('src/features/form/FormContext', () => ({
  FormStore: { bootstrap: { useLayoutCollection: () => mocks.layouts } },
}));
vi.mock('src/features/form/layoutSettings/processLayoutSettings', () => ({
  usePageGroups: vi.fn(),
  usePageSettings: () => ({ validationOnNavigation: mocks.globalValidation }),
}));
vi.mock('src/features/validation/validationHooks', () => ({
  useGetDerivedValidationState: () => mocks.derive,
  usePageValidations: vi.fn(),
}));
vi.mock('src/hooks/navigation', () => ({ useNavigationParam: () => mocks.currentPage }));
vi.mock('src/hooks/useNavigatePage', () => ({ usePageOrder: () => mocks.order, useVisitedPages: vi.fn() }));
vi.mock('src/utils/layout/hidden', () => ({ useHiddenPages: vi.fn() }));

function snapshot({
  hidden = false,
  severity = 'error',
  category = ValidationMask.Required,
}: { hidden?: boolean; severity?: ValidationSeverity; category?: ValidationCategory } = {}): DerivedValidationState {
  const nodes = ['middle-node', 'later-node'].map((id, index) => ({
    id,
    baseId: id,
    pageKey: index === 0 ? 'Middle' : 'Later',
    parent: { type: 'page' as const, id: 'Middle', baseId: 'Middle' },
    parentId: undefined,
    rowContexts: [],
    rowIds: [],
    hidden,
    isValid: true,
  }));
  return {
    nodes,
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    nodeIdsByPage: new Map([
      ['Middle', ['middle-node']],
      ['Later', ['later-node']],
    ]),
    nodeIdsByRowId: new Map(),
    rawValidationsByNode: new Map(
      nodes.map((node) => [
        node.id,
        [
          {
            source: FrontendValidationSource.EmptyField,
            severity: severity as 'error' | 'warning',
            message: { key: 'Required' },
            category,
          },
        ],
      ]),
    ),
    visibleBreakdownByNode: new Map(nodes.map((node) => [node.id, emptyBreakdown])),
  };
}

function page(show?: ('Required' | 'Schema')[]): ILayoutCollection[string] {
  return { data: { layout: [], ...(show ? { validationOnNavigation: { page: 'current', show } } : {}) } };
}

describe('navigation validation derivation', () => {
  beforeEach(() => {
    mocks.currentPage = 'First';
    mocks.layouts = { First: page(), Middle: page(), Later: page(), Last: page() };
    mocks.globalValidation = undefined;
    mocks.derive.mockReset().mockReturnValue(snapshot());
  });

  it.each(['First', 'Missing'])('does not derive for the current or an unknown target page %s', (target) => {
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current(target)).toBe(false);
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it('does not derive for backward navigation or an unknown current page', () => {
    mocks.currentPage = 'Last';
    const { result, rerender } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('First')).toBe(false);
    mocks.currentPage = 'Missing';
    rerender();
    expect(result.current('Last')).toBe(false);
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it('does not derive for adjacent forward navigation, even when validation is enabled globally', () => {
    mocks.globalValidation = { show: ['Required'] };
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('Middle')).toBe(false);
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it('does not derive when no intervening page enables navigation validation', () => {
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('Last')).toBe(false);
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it('blocks a forward skip with a required error and derives exactly once', () => {
    mocks.layouts.Middle = page(['Required']);
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('Last')).toBe(true);
    expect(mocks.derive).toHaveBeenCalledTimes(1);
  });

  it('uses the global navigation mask when the intervening page has no override', () => {
    mocks.globalValidation = { show: ['Required'] };
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('Last')).toBe(true);
    expect(mocks.derive).toHaveBeenCalledTimes(1);
  });

  it('lets the page mask override the global mask and shares one snapshot across intervening pages', () => {
    mocks.globalValidation = { show: ['Required'] };
    mocks.layouts.Middle = page(['Schema']);
    mocks.layouts.Later = page(['Schema']);
    const { result } = renderHook(useGetNavigationIsPrevented);
    expect(result.current('Last')).toBe(false);
    expect(mocks.derive).toHaveBeenCalledTimes(1);
  });

  it.each([{ hidden: true }, { severity: 'warning' as const }])(
    'does not block for hidden nodes or warnings %o',
    (options) => {
      mocks.globalValidation = { show: ['Required'] };
      mocks.derive.mockReturnValue(snapshot(options));
      const { result } = renderHook(useGetNavigationIsPrevented);
      expect(result.current('Last')).toBe(false);
      expect(mocks.derive).toHaveBeenCalledTimes(1);
    },
  );
});
