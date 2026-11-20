import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router';
import type { PropsWithChildren } from 'react';

import { act, renderHook } from '@testing-library/react';

import { useAllNavigationParams, useIsSubformPage, useNavigationParam } from 'src/hooks/navigation';

function Wrapper({ children }: PropsWithChildren) {
  return (
    <MemoryRouter initialEntries={['/instance/500000/instance-guid/Task_1/First%20page']}>{children}</MemoryRouter>
  );
}

it('keeps parameter hooks consistent through normal pages, subforms and stateless routes', () => {
  const { result } = renderHook(
    () => ({
      page: useNavigationParam('pageKey'),
      mainPage: useNavigationParam('mainPageKey'),
      task: useNavigationParam('taskId'),
      owner: useNavigationParam('instanceOwnerPartyId'),
      all: useAllNavigationParams(),
      subform: useIsSubformPage(),
      navigate: useNavigate(),
    }),
    { wrapper: Wrapper },
  );

  expect(result.current).toMatchObject({ page: 'First page', task: 'Task_1', owner: '500000', subform: false });
  expect(result.current.page).toBe(result.current.all.pageKey);

  act(() => result.current.navigate('/instance/500000/instance-guid/Task_1/Main%20page/subform/data-id/Child%20page'));
  expect(result.current).toMatchObject({ page: 'Child page', mainPage: 'Main page', subform: true });
  expect(result.current.all).toMatchObject({ componentId: 'subform', dataElementId: 'data-id' });

  act(() => result.current.navigate('/instance/500000/instance-guid/Task_1/Main%20page/subform/data-id'));
  expect(result.current).toMatchObject({ page: undefined, mainPage: 'Main page', subform: false });

  act(() => result.current.navigate('/Stateless%20page'));
  expect(result.current).toMatchObject({ page: 'Stateless page', task: undefined, owner: undefined, subform: false });
});
