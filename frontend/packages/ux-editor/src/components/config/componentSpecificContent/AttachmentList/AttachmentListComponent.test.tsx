import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAttachmentListComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderHookWithMockStore, renderWithMockStore } from '../../../../testing/mocks';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { AttachmentListComponent } from './AttachmentListComponent';
import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const org = 'org';
const app = 'app';

const getAppMetadata = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ...queriesMock,
    dataTypes: ['test1', 'test2'],
  }),
);

const component: FormAttachmentListComponent = {
  id: '1',
  type: ComponentType.AttachmentList,
  itemType: 'COMPONENT',
};

const handleComponentChange = jest.fn();

const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSetsQuery(org, app))
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IGenericEditComponent> = {}) => {
  return renderWithMockStore(
    {},
    { getAppMetadata },
  )(<AttachmentListComponent {...defaultProps} {...props} />);
};

describe('AttachmentListComponent', () => {
  it('should render a spinner while loading', async () => {
    await render();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('should render AttachmentList component', async () => {
    await waitForData();
    await render();
    expect(screen.queryByTestId('studio-spinner-test-id')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
