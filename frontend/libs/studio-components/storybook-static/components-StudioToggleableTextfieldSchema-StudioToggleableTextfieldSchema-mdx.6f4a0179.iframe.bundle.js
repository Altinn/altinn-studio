'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [3881, 3355],
  {
    './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.mdx': (
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
        _StudioToggleableTextfieldSchema_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.stories.tsx',
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
                { of: _StudioToggleableTextfieldSchema_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioToggleableTextfieldSchema',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioToggleableTextfieldSchema is a component that can toggled between view and edit mode.\nSupport validation against a schema.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                {
                  of: _StudioToggleableTextfieldSchema_stories__WEBPACK_IMPORTED_MODULE_2__.Preview,
                },
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
    './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.stories.tsx':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.r(__webpack_exports__),
          __webpack_require__.d(__webpack_exports__, {
            Preview: () => Preview,
            __namedExportsOrder: () => __namedExportsOrder,
            default: () => __WEBPACK_DEFAULT_EXPORT__,
          });
        var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.tsx',
          ),
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../studio-icons/src/index.ts',
          );
        const meta = {
            title: 'StudioToggleableTextfieldSchema',
            component: _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__.X,
          },
          Preview = (args) =>
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__.X,
              args,
            );
        Preview.args = {
          viewProps: { variant: 'tertiary', size: 'small', children: 'My awesome value' },
          inputProps: {
            icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _studio_icons__WEBPACK_IMPORTED_MODULE_2__.KeyVerticalIcon,
              null,
            ),
            label: 'My awesome label',
            size: 'small',
            placeholder: 'Placeholder',
            error: '',
          },
        };
        const __WEBPACK_DEFAULT_EXPORT__ = meta,
          __namedExportsOrder = ['Preview'];
        Preview.parameters = {
          ...Preview.parameters,
          docs: {
            ...Preview.parameters?.docs,
            source: {
              originalSource:
                'args => <StudioToggleableTextfieldSchema {...args}></StudioToggleableTextfieldSchema>',
              ...Preview.parameters?.docs?.source,
            },
          },
        };
      },
  },
]);
