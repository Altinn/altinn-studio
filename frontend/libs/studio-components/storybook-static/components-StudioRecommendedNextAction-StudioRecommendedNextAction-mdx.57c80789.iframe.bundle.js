(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [7017, 1435],
  {
    './src/components/StudioRecommendedNextAction/StudioRecommendedNextAction.mdx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
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
        _StudioRecommendedNextAction_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioRecommendedNextAction/StudioRecommendedNextAction.stories.tsx',
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
                { of: _StudioRecommendedNextAction_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioRecommendedNextAction',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioRecommendedNextAction is a composed component designed to present a recommended next action\nto the user. Can be used to present an action suggestion that can be either performed or skipped.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioRecommendedNextAction_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
      'use strict';
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
    './src/components/StudioRecommendedNextAction/StudioRecommendedNextAction.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          ExampleUseCase: () => ExampleUseCase,
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _storybook_test__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/@storybook/test/dist/index.mjs',
        ),
        _index__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioRecommendedNextAction/index.ts',
        ),
        _StudioIconTextfield__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          './src/components/StudioIconTextfield/index.ts',
        ),
        _studio_icons_src__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const ComposedPreviewComponent = (props) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _index__WEBPACK_IMPORTED_MODULE_2__.l0,
            props,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              'p',
              null,
              'StudioRecommendedNextAction children will appear here',
            ),
          ),
        meta = {
          title: 'StudioRecommendedNextAction',
          component: _index__WEBPACK_IMPORTED_MODULE_2__.l0,
          args: {
            onSave: (0, _storybook_test__WEBPACK_IMPORTED_MODULE_1__.fn)(),
            onSkip: (0, _storybook_test__WEBPACK_IMPORTED_MODULE_1__.fn)(),
          },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(ComposedPreviewComponent, args);
      Preview.args = {
        title: 'Recommended action title',
        description: 'Recommended action description',
        saveButtonText: 'Save',
        skipButtonText: 'Skip',
        hideSaveButton: !1,
      };
      const ExampleUseCase = (args) => {
          const [name, setName] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
          return react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            'div',
            { style: { width: '500px' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _index__WEBPACK_IMPORTED_MODULE_2__.l0,
              {
                title: 'Gi et nytt navn',
                description: 'Du kan gi denne et nytt navn',
                saveButtonText: 'Lagre',
                skipButtonText: 'Hopp over',
                hideSaveButton: 'Bernard' !== name,
                onSave: args.onSave,
                onSkip: args.onSkip,
              },
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _StudioIconTextfield__WEBPACK_IMPORTED_MODULE_3__.l,
                {
                  error: 'Bernard' !== name ? 'Navnet må være Bernard' : '',
                  onChange: (e) => setName(e.target.value),
                  icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                    _studio_icons_src__WEBPACK_IMPORTED_MODULE_4__.KeyVerticalIcon,
                    null,
                  ),
                  size: 'sm',
                  label: 'Nytt navn',
                },
              ),
            ),
          );
        },
        __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview', 'ExampleUseCase'];
      (Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <ComposedPreviewComponent {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      }),
        (ExampleUseCase.parameters = {
          ...ExampleUseCase.parameters,
          docs: {
            ...ExampleUseCase.parameters?.docs,
            source: {
              originalSource:
                "(args): React.ReactElement => {\n  const [name, setName] = useState('');\n  return <div style={{\n    width: '500px'\n  }}>\n      <StudioRecommendedNextAction title='Gi et nytt navn' description='Du kan gi denne et nytt navn' saveButtonText='Lagre' skipButtonText='Hopp over' hideSaveButton={name !== 'Bernard'} onSave={args.onSave} onSkip={args.onSkip}>\n        <StudioIconTextfield error={name !== 'Bernard' ? 'Navnet må være Bernard' : ''} onChange={e => setName(e.target.value)} icon={<KeyVerticalIcon />} size='sm' label='Nytt navn' />\n      </StudioRecommendedNextAction>\n    </div>;\n}",
              ...ExampleUseCase.parameters?.docs?.source,
            },
          },
        });
    },
    '../../../node_modules/@storybook/test/dist sync recursive': (module) => {
      function webpackEmptyContext(req) {
        var e = new Error("Cannot find module '" + req + "'");
        throw ((e.code = 'MODULE_NOT_FOUND'), e);
      }
      (webpackEmptyContext.keys = () => []),
        (webpackEmptyContext.resolve = webpackEmptyContext),
        (webpackEmptyContext.id = '../../../node_modules/@storybook/test/dist sync recursive'),
        (module.exports = webpackEmptyContext);
    },
  },
]);
