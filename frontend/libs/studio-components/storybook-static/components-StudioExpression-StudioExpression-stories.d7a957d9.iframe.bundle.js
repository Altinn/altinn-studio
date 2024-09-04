'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [7893],
  {
    './src/components/StudioExpression/StudioExpression.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => StudioExpression_stories,
        });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        StudioExpression = __webpack_require__(
          './src/components/StudioExpression/StudioExpression.tsx',
        ),
        LogicalTupleOperator = __webpack_require__(
          './src/components/StudioExpression/enums/LogicalTupleOperator.ts',
        ),
        DataLookupFuncName = __webpack_require__(
          './src/components/StudioExpression/enums/DataLookupFuncName.ts',
        );
      const dataModelPointers = ['#', '#/properties/test1', '#/properties/test2'],
        componentIds = ['component1', 'component2', 'component3'],
        dataLookupOptions = {
          [DataLookupFuncName.A.DataModel]: dataModelPointers,
          [DataLookupFuncName.A.Component]: componentIds,
          [DataLookupFuncName.A.GatewayAction]: ['sign', 'reject'],
        };
      var GeneralRelationOperator = __webpack_require__(
          './src/components/StudioExpression/enums/GeneralRelationOperator.ts',
        ),
        NumberRelationOperator = __webpack_require__(
          './src/components/StudioExpression/enums/NumberRelationOperator.ts',
        );
      const dataModelValue = [DataLookupFuncName.A.DataModel, dataModelPointers[0]],
        componentValue = [DataLookupFuncName.A.Component, componentIds[0]],
        generalOperatorRelation = [GeneralRelationOperator.R.Equals, dataModelValue, 'some-text'],
        numberOperatorRelation = [NumberRelationOperator.a.GreaterThan, componentValue, 5],
        logicalExpression = [
          LogicalTupleOperator.y.And,
          generalOperatorRelation,
          numberOperatorRelation,
        ];
      LogicalTupleOperator.y.Or, LogicalTupleOperator.y.And;
      var InstanceContext = __webpack_require__(
          './src/components/StudioExpression/enums/InstanceContext.ts',
        ),
        ExpressionErrorKey = __webpack_require__(
          './src/components/StudioExpression/enums/ExpressionErrorKey.ts',
        ),
        SimpleSubexpressionValueType = __webpack_require__(
          './src/components/StudioExpression/enums/SimpleSubexpressionValueType.ts',
        ),
        GatewayActionContext = __webpack_require__(
          './src/components/StudioExpression/enums/GatewayActionContext.ts',
        );
      const valueTypes = {
          [SimpleSubexpressionValueType.C.Boolean]: 'Boolean',
          [SimpleSubexpressionValueType.C.Component]: 'Component',
          [SimpleSubexpressionValueType.C.DataModel]: 'DataModel',
          [SimpleSubexpressionValueType.C.GatewayAction]: 'Gateway action',
          [SimpleSubexpressionValueType.C.GatewayActionContext]: 'Gateway action context',
          [SimpleSubexpressionValueType.C.InstanceContext]: 'Instance context',
          [SimpleSubexpressionValueType.C.Null]: 'Null',
          [SimpleSubexpressionValueType.C.Number]: 'Number',
          [SimpleSubexpressionValueType.C.String]: 'String',
        },
        relationalOperators = {
          [GeneralRelationOperator.R.Equals]: 'equals',
          [GeneralRelationOperator.R.NotEquals]: 'is not equal to',
          [NumberRelationOperator.a.GreaterThan]: 'is greater than',
          [NumberRelationOperator.a.GreaterThanOrEq]: 'is greater than or equal to',
          [NumberRelationOperator.a.LessThan]: 'is less than',
          [NumberRelationOperator.a.LessThanOrEq]: 'is less than or equal to',
        },
        logicalTupleOperators = {
          [LogicalTupleOperator.y.And]: 'And',
          [LogicalTupleOperator.y.Or]: 'Or',
        },
        gatewayActionContext = {
          [GatewayActionContext.e.Confirm]: 'Confirm',
          [GatewayActionContext.e.Pay]: 'Pay',
          [GatewayActionContext.e.Sign]: 'Sign',
          [GatewayActionContext.e.Reject]: 'Reject',
        },
        instanceContext = {
          [InstanceContext.N.AppId]: 'App ID',
          [InstanceContext.N.InstanceId]: 'Instance ID',
          [InstanceContext.N.InstanceOwnerPartyId]: 'Instance owner party ID',
        },
        texts = {
          addSubexpression: 'Add subexpression',
          and: 'and',
          andOr: 'and / or',
          cannotSimplify:
            'The expression is not in a format that is supported by the simplified editor.',
          cannotSaveSinceInvalid: 'Cannot save since the expression is invalid.',
          changeToSimplifiedWarning:
            'The expression is not valid and will not be saved if you leave the tab. Are you sure you want to continue?',
          componentId: 'Component ID',
          confirmDeleteSubexpression: 'Are you sure you want to delete this subexpression?',
          dataModelPath: 'Data model path',
          delete: 'Delete',
          disabledLogicalOperator:
            'There must be at least two subexpressions to use a logical operator.',
          edit: 'Edit',
          errorListFooter: 'Fix the errors and try again.',
          errorListHeader: 'The following errors were found:',
          errorMessages: {
            [ExpressionErrorKey.E.InvalidComponentId]:
              'The component ID is invalid. Choose one from the list.',
            [ExpressionErrorKey.E.InvalidDataModelPath]:
              'The data model path is invalid. Choose one from the list.',
            [ExpressionErrorKey.E.InvalidFirstOperand]: 'The first operand is invalid.',
            [ExpressionErrorKey.E.InvalidSecondOperand]: 'The second operand is invalid.',
            [ExpressionErrorKey.E.NumericRelationOperatorWithWrongType]:
              'The relational operator is invalid for the selected operand types.',
            [ExpressionErrorKey.E.ComponentIDNoLongerExists]: 'The component ID no longer exists.',
          },
          expression: 'Expression',
          false: 'False',
          firstOperand: 'First operand',
          gatewayActionKey: 'Gateway action key',
          gatewayActionContext,
          instanceContext,
          instanceContextKey: 'Instance context key',
          invalidExpression: 'Invalid expression',
          logicalOperation: 'Logical operation',
          logicalOperator: 'Logical operator',
          logicalTupleOperators,
          manual: 'Manual',
          numberValidationError: 'The value must be a number.',
          or: 'or',
          readonlyComponentId: 'Component ID:',
          readonlyDataModelPath: 'Data model path:',
          readonlyGatewayActionContext: 'Gateway action context:',
          readonlyInstanceContext: 'Instance context:',
          relationalOperator: 'Relational operator',
          relationalOperators,
          save: 'Save',
          saveAndClose: 'Save and close',
          secondOperand: 'Second operand',
          simplified: 'Simplified',
          subexpression: (index) => `Sub-expression number ${index + 1}`,
          transformToLogical: 'Transform to logical expression',
          true: 'True',
          value: 'Value',
          valueType: 'Type',
          valueTypes,
        },
        meta = { title: 'StudioExpression', component: StudioExpression.B },
        Preview = (args) => react.createElement(StudioExpression.B, args);
      Preview.args = { expression: logicalExpression, texts, dataLookupOptions };
      const StudioExpression_stories = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioExpression {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
