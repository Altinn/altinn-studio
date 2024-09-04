'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6995, 7893],
  {
    './src/components/StudioExpression/StudioExpression.mdx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, { default: () => MDXContent });
      __webpack_require__('../../../node_modules/react/index.js');
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            '../../../node_modules/@storybook/addon-docs/node_modules/@mdx-js/react/lib/index.js',
          ),
        _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@storybook/addon-docs/node_modules/@storybook/blocks/dist/index.mjs',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _StudioExpression_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioExpression/StudioExpression.stories.tsx',
        );
      function _createMdxContent(props) {
        const _components = {
          p: 'p',
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_3__.R)(),
          ...props.components,
        };
        return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
          react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,
          {
            children: [
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.W8,
                { of: _StudioExpression_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioExpression',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioExpression is a component that renders a expression. It is used to display and modify\nexpressions in Studio.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioExpression_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
              ),
            ],
          },
        );
      }
      function MDXContent(props = {}) {
        const { wrapper: MDXLayout } = {
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_3__.R)(),
          ...props.components,
        };
        return MDXLayout
          ? (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(MDXLayout, {
              ...props,
              children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_createMdxContent, {
                ...props,
              }),
            })
          : _createMdxContent(props);
      }
    },
    '../../../node_modules/@storybook/addon-docs/node_modules/@mdx-js/react/lib/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        R: () => useMDXComponents,
        x: () => MDXProvider,
      });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        '../../../node_modules/react/index.js',
      );
      const emptyComponents = {},
        MDXContext = react__WEBPACK_IMPORTED_MODULE_0__.createContext(emptyComponents);
      function useMDXComponents(components) {
        const contextComponents = react__WEBPACK_IMPORTED_MODULE_0__.useContext(MDXContext);
        return react__WEBPACK_IMPORTED_MODULE_0__.useMemo(
          function () {
            return 'function' == typeof components
              ? components(contextComponents)
              : { ...contextComponents, ...components };
          },
          [contextComponents, components],
        );
      }
      function MDXProvider(properties) {
        let allComponents;
        return (
          (allComponents = properties.disableParentContext
            ? 'function' == typeof properties.components
              ? properties.components(emptyComponents)
              : properties.components || emptyComponents
            : useMDXComponents(properties.components)),
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            MDXContext.Provider,
            { value: allComponents },
            properties.children,
          )
        );
      }
    },
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
