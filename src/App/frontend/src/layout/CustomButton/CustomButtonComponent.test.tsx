import React from 'react';

import { screen } from '@testing-library/react';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { CustomButtonComponent } from 'src/layout/CustomButton/CustomButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CustomAction } from 'src/layout/CustomButton/config.generated';
import type { IUserAction } from 'src/types/shared';

describe('CustomButtonComponent', () => {
  it('should be disabled if the action provided is not authorized', async () => {
    await render({
      actions: [{ id: 'lookupPerson', type: 'ServerAction' }],
      actionAuthorization: [
        {
          id: 'lookupPerson',
          authorized: false,
          type: 'ServerAction',
        },
      ],
    });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be enabled if the action provided is authorized', async () => {
    await render({
      actions: [{ id: 'lookupPerson', type: 'ServerAction' }],
      actionAuthorization: [
        {
          id: 'lookupPerson',
          authorized: true,
          type: 'ServerAction',
        },
      ],
    });

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should be disabled if one of the actions provided is not authorized', async () => {
    await render({
      actions: [
        { id: 'lookupPerson', type: 'ServerAction' },
        { id: 'fillForm', type: 'ServerAction' },
      ],
      actionAuthorization: [
        {
          id: 'lookupPerson',
          authorized: true,
          type: 'ServerAction',
        },
        {
          id: 'calculateData',
          authorized: true,
          type: 'ServerAction',
        },
        {
          id: 'fillForm',
          authorized: false,
          type: 'ServerAction',
        },
      ],
    });
  });

  it('should not be disabled if one of the actions provided is not authorized but is not used in the custom button', async () => {
    await render({
      actions: [
        { id: 'lookupPerson', type: 'ServerAction' },
        { id: 'calculateData', type: 'ServerAction' },
      ],
      actionAuthorization: [
        {
          id: 'lookupPerson',
          authorized: true,
          type: 'ServerAction',
        },
        {
          id: 'calculateData',
          authorized: true,
          type: 'ServerAction',
        },
        {
          id: 'fillForm',
          authorized: false,
          type: 'ServerAction',
        },
      ],
    });

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should not be disabled if one of the client side actions does not exist in authorizations', async () => {
    await render({
      actions: [
        { id: 'lookupPerson', type: 'ServerAction' },
        { id: 'calculateData', type: 'ServerAction' },
        { id: 'nextPage', type: 'ClientAction' },
      ],
      actionAuthorization: [
        {
          id: 'lookupPerson',
          authorized: true,
          type: 'ServerAction',
        },
        {
          id: 'calculateData',
          authorized: true,
          type: 'ServerAction',
        },
      ],
    });

    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});

type RenderProps = {
  actions?: CustomAction[];
  actionAuthorization?: IUserAction[];
};

async function render({ actions, actionAuthorization }: RenderProps = { actionAuthorization: [] }) {
  const process = getProcessDataMock((p) => {
    p.currentTask!.userActions = [
      { id: 'read', authorized: true, type: 'ProcessAction' },
      { id: 'write', authorized: true, type: 'ProcessAction' },
      { id: 'complete', authorized: false, type: 'ProcessAction' },
      ...(actionAuthorization ?? []),
    ];
  });
  const instanceData = { ...getInstanceDataMock(), process };

  await renderGenericComponentTest({
    type: 'CustomButton',
    renderer: (props) => <CustomButtonComponent {...props} />,
    component: {
      textResourceBindings: {
        title: 'Custom button',
      },
      actions,
    },
    apis: {
      instanceApi: {
        getInstance: async () => instanceData,
      },
    },
  });
}
