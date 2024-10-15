import React, { createRef } from 'react';
import { render, screen, type RenderResult } from '@testing-library/react';
import { AddSubformModal, type AddSubformModalProps } from './AddSubformModal';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';

const existingLayoutSetForSubform = 'existingLayoutSetForSubform';
const onUpdateLayoutSet = jest.fn();

const defaultProps: AddSubformModalProps = {
  existingLayoutSetForSubform: '',
  onUpdateLayoutSet,
};

describe('AddSubformModal', () => {
  it('Should render the AddSubformModal', () => {
    renderAddSubformModal();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  //TODO: Add more tests --WIP
});

const renderAddSubformModal = async (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
): Promise<RenderResult> => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  const ref = createRef<HTMLDialogElement>();
  // eslint-disable-next-line testing-library/render-result-naming-convention
  const renderResult = render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AddSubformModal ref={ref} {...defaultProps} />
    </ServicesContextProvider>,
  );
  ref.current?.showModal();
  await screen.findByRole('dialog');
  return renderResult;
};
