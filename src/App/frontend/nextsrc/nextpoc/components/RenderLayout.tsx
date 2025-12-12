import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import classNames from 'classnames';
import { RenderComponent } from 'nextsrc/nextpoc/components/RenderComponent';
import type { ResolvedCompExternal } from 'nextsrc/nextpoc/stores/layoutStore';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/layout/GenericComponent.module.css';
import type { Expression } from 'src/features/expressions/types';

interface RenderLayoutType {
  components?: ResolvedCompExternal[];
  parentBinding?: string;
  itemIndex?: number;
}

const getBinding = (component: ResolvedCompExternal): string | undefined => {
  if (component.type === 'RepeatingGroup') {
    // @ts-ignore
    return component.dataModelBindings['group'];
  }

  return component.dataModelBindings && component.dataModelBindings['simpleBinding']
    ? component.dataModelBindings['simpleBinding']
    : undefined;
};

export const RenderLayout: React.FunctionComponent<RenderLayoutType> = ({ components, parentBinding, itemIndex }) => {
  if (!components) {
    return null;
  }

  return (
    <Flex
      container
      spacing={6}
      alignItems='flex-start'
    >
      {components.map((currentComponent) => {
        const childMapping = getBinding(currentComponent);

        const childField = childMapping && parentBinding ? childMapping.replace(parentBinding, '') : undefined;
        const id = `item-${currentComponent.id}`;

        return (
          <Flex
            data-componentbaseid={id}
            data-componentid={id}
            data-componenttype={currentComponent.type}
            item
            container
            size={currentComponent.grid}
            key={`grid-${id}`}
            className={classNames(classes.container)}
          >
            <RenderComponent
              component={currentComponent}
              parentBinding={parentBinding}
              itemIndex={itemIndex}
              childField={childField}
            />
          </Flex>
        );
      })}
    </Flex>
  );
};

interface RenderLayoutRowType {
  components?: ResolvedCompExternal[];
  parentBinding?: string;
  itemIndex?: number;
  isRowHiddenExpression?: Expression;
}

export const RenderLayoutRow: React.FunctionComponent<RenderLayoutRowType> = ({
  components,
  parentBinding,
  itemIndex,
  isRowHiddenExpression,
}) => {
  console.log('isRowHiddenExpression', isRowHiddenExpression);
  // const isHidden = useStore(layoutStore, (state) => {
  //   if (!isRowHiddenExpression) {
  //     return false;
  //   }
  //   // @ts-ignore
  //   return state.evaluateExpression(isRowHiddenExpression, parentBinding, itemIndex);
  // });
  //
  // if (isHidden) {
  //   return null;
  // }

  if (!components) {
    return null;
  }

  return (
    <Table.Row>
      {components.map((currentComponent) => {
        const childMapping = getBinding(currentComponent);

        const childField = childMapping && parentBinding ? childMapping.replace(parentBinding, '') : undefined;

        return (
          <Table.Cell key={currentComponent.id}>
            <RenderComponent
              component={currentComponent}
              parentBinding={parentBinding}
              itemIndex={itemIndex}
              childField={childField}
            />
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
};
