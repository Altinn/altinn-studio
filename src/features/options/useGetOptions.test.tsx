import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IRawOption, ISelectionComponentExternal } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface RenderProps {
  type: 'single' | 'multi';
  via: 'layout' | 'api' | 'repeatingGroups';
  options?: IRawOption[];
  mapping?: Record<string, string>;
  fetchOptions?: () => Promise<AxiosResponse<IRawOption[], any>>;
}

function TestOptions({ node }: { node: LayoutNode<'Dropdown' | 'MultipleSelect'> }) {
  const { options, setData, selectedValues } = useGetOptions({
    ...node.item,
    valueType: node.item.type === 'Dropdown' ? 'single' : 'multi',
    node,
  });

  const setterFor = (index: number) => () => setData([options[index].value]);

  return (
    <>
      <div data-testid='options'>{JSON.stringify(options)}</div>
      <div data-testid='currentStringy'>{JSON.stringify(selectedValues)}</div>
      <button onClick={setterFor(0)}>Choose first option</button>
      <button onClick={setterFor(1)}>Choose second option</button>
      <button onClick={setterFor(2)}>Choose third option</button>
      <button onClick={setterFor(3)}>Choose fourth option</button>
    </>
  );
}

async function render(props: RenderProps) {
  const layoutConfig: ISelectionComponentExternal = {
    options: props.via === 'layout' ? props.options : undefined,
    optionsId: props.via === 'api' ? 'myOptions' : undefined,
    mapping: props.via === 'api' ? props.mapping : undefined,
    source:
      props.via === 'repeatingGroups'
        ? {
            group: 'Group',
            value: 'Group.value',
            label: 'myLabel',
          }
        : undefined,
  };

  return renderWithNode({
    renderer: ({ node }) => <TestOptions node={node as LayoutNode<'Dropdown' | 'MultipleSelect'>} />,
    nodeId: 'myComponent',
    inInstance: true,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [
              {
                type: props.type === 'single' ? 'Dropdown' : 'MultipleSelect',
                id: 'myComponent',
                dataModelBindings: {
                  simpleBinding: 'result',
                },
                textResourceBindings: {
                  title: 'mockTitle',
                },
                ...layoutConfig,
              },
            ],
          },
        },
      }),
      fetchFormData: async () => ({
        Group: structuredClone(props.options ?? []).map((option, index) => ({
          [ALTINN_ROW_ID]: `row-${index}`,
          ...option,
        })),
        result: '',
        someOther: 'value',
      }),
      fetchOptions:
        props.fetchOptions ??
        (async () =>
          ({
            data: props.options,
            headers: {},
          }) as AxiosResponse<IRawOption[], any>),
      fetchTextResources: async () => ({
        resources: [
          {
            id: 'myLabel',
            value: '{0}',
            variables: [
              {
                dataSource: 'dataModel.default',
                key: 'Group[{0}].label',
              },
            ],
          },
        ],
        language: 'nb',
      }),
    },
  });
}

describe('useGetOptions', () => {
  const permutations: Omit<RenderProps, 'options'>[] = [
    { type: 'single', via: 'layout' },
    { type: 'single', via: 'api' },
    { type: 'single', via: 'repeatingGroups' },
    { type: 'multi', via: 'layout' },
    { type: 'multi', via: 'api' },
    { type: 'multi', via: 'repeatingGroups' },
  ];

  it.each(permutations)('options should be cast to strings for $type + $via', async (props) => {
    const options = [
      { label: 'first', value: 'hello' },
      { label: 'second', value: false },
      { label: 'third', value: 2 },
      { label: 'fourth', value: 3.14 },
    ];
    const { formDataMethods } = await render({
      ...props,
      options,
    });

    const textContent = screen.getByTestId('options').textContent;
    const asArray = JSON.parse(textContent as string) as IOptionInternal[];

    expect(asArray).toEqual([
      { label: 'first', value: 'hello' },
      { label: 'second', value: 'false' },
      { label: 'third', value: '2' },
      { label: 'fourth', value: '3.14' },
    ]);

    // Try setting the value to all the options, and observing that the saved value is the stringy version
    for (const option of options) {
      await userEvent.click(screen.getByRole('button', { name: `Choose ${option.label} option` }));
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        path: 'result',
        newValue: option.value.toString(),
      });
      (formDataMethods.setLeafValue as jest.Mock).mockClear();

      const currentStringy = JSON.parse(screen.getByTestId('currentStringy').textContent as string);
      expect(currentStringy).toEqual([option.value.toString()]);
    }
  });

  it('should include the mapping in the api request', async () => {
    const fetchOptions = jest.fn().mockResolvedValue({ data: [], headers: {} });
    await render({
      via: 'api',
      type: 'single',
      mapping: { someOther: 'someParam', result: 'someEmpty' },
      fetchOptions,
    });

    expect(fetchOptions).toHaveBeenCalledWith(
      expect.stringMatching(/^.+\/api\/options\/myOptions.+someParam=value&someEmpty=$/),
    );
  });
});
