import React from 'react';

import { screen } from '@testing-library/react';

import { getFormDataStateMock } from 'src/__mocks__/getFormDataStateMock';
import { getFormLayoutStateMock } from 'src/__mocks__/getFormLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { GenericComponent } from 'src/layout/GenericComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const render = async (component: Partial<CompExternal> = {}, waitUntilLoaded = true) => {
  const formLayout = getFormLayoutStateMock({
    layouts: {
      FormLayout: [
        {
          type: 'Input',
          id: 'mockId',
          dataModelBindings: {
            simpleBinding: 'mockDataBinding',
          },
          readOnly: false,
          required: false,
          disabled: false,
          textResourceBindings: {},
          triggers: [],
          grid: {
            xs: 12,
            sm: 10,
            md: 8,
            lg: 6,
            xl: 4,
            innerGrid: {
              xs: 11,
              sm: 9,
              md: 7,
              lg: 5,
              xl: 3,
            },
          },
          ...(component as any),
        },
      ],
    },
  });

  const formData = getFormDataStateMock({
    formData: {
      mockDataBinding: 'value',
    },
  });

  return await renderWithNode({
    nodeId: component.id || 'mockId',
    renderer: ({ node }) => <GenericComponent node={node} />,
    waitUntilLoaded,
    reduxState: {
      ...getInitialStateMock(),
      formLayout,
      formData,
    },
  });
};

describe('GenericComponent', () => {
  it('should show an error in the logs when rendering an unknown component type', async () => {
    const spy = jest.spyOn(window, 'logWarnOnce').mockImplementation();
    await render({ type: 'unknown-type' as any }, false);

    expect(spy).toHaveBeenCalledWith(`No component definition found for type 'unknown-type'`);
  });

  it('should render Input component when passing Input type', async () => {
    await render({ type: 'Input' });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/unknown component type/i)).not.toBeInTheDocument();
  });

  it('should render description and label when textResourceBindings includes description and title', async () => {
    await render({
      type: 'Input',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    });

    expect(screen.getByTestId('description-mockId')).toBeInTheDocument();
    expect(screen.getByTestId('label-mockId')).toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings does not include description and title', async () => {
    await render({
      type: 'Input',
      textResourceBindings: {},
    });

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings includes description and title, but the component is listed in "noLabelComponents"', async () => {
    await render({
      type: 'NavigationBar',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    } as any);

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });
});
