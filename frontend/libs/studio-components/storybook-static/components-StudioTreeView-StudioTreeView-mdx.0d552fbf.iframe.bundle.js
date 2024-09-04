/*! For license information please see components-StudioTreeView-StudioTreeView-mdx.0d552fbf.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [8745, 5643],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { $: () => Button });
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          ),
        _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const Button = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        (
          {
            children,
            color = 'first',
            variant = 'primary',
            fullWidth = !1,
            icon = !1,
            type = 'button',
            className,
            asChild,
            ...rest
          },
          ref,
        ) => {
          const size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(rest.size || 'md'),
            Component = asChild
              ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__.D
              : 'button';
          return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
            ref,
            type,
            className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
              'fds-btn',
              'fds-focus',
              `fds-btn--${size}`,
              `fds-btn--${variant}`,
              `fds-btn--${color}`,
              fullWidth && 'fds-btn--full-width',
              icon && 'fds-btn--icon-only',
              className,
            ),
            ...rest,
            children,
          });
        },
      );
      Button.displayName = 'Button';
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { D: () => Heading });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
            ),
          _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
          );
        const Heading = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ level = 1, spacing = !1, className, asChild, ...rest }, ref) => {
            const Component = asChild
                ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                : `h${level ?? 1}`,
              size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__.Y)(rest.size || 'xl');
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
              ref,
              className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                'fds-heading',
                `fds-heading--${size}`,
                spacing && 'fds-heading--spacing',
                className,
              ),
              ...rest,
            });
          },
        );
        Heading.displayName = 'Heading';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { f: () => Paragraph });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
            ),
          _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
          );
        const Paragraph = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ className, spacing, asChild, variant, ...rest }, ref) => {
            const Component = asChild
                ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                : 'p',
              size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__.Y)(rest.size || 'md');
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
              ref,
              className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                'fds-paragraph',
                `fds-paragraph--${size}`,
                spacing && 'fds-paragraph--spacing',
                variant && `fds-paragraph--${variant}`,
                className,
              ),
              ...rest,
            });
          },
        );
        Paragraph.displayName = 'Paragraph';
      },
    './src/components/StudioTreeView/StudioTreeView.mdx': (
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
        _StudioTreeView_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioTreeView/StudioTreeView.stories.tsx',
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
                { of: _StudioTreeView_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioTreeView',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                { children: 'StudioTreeView is used to display a tree structure of items.' },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioTreeView_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioTreeView/StudioTreeView.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          WithIcon: () => WithIcon,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTreeView/index.ts',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const PreviewComponent = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _index__WEBPACK_IMPORTED_MODULE_1__.c.Root,
            null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _index__WEBPACK_IMPORTED_MODULE_1__.c.Item,
              args,
            ),
          ),
        meta = { title: 'StudioTreeView', component: PreviewComponent },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(PreviewComponent, args);
      Preview.args = { children: 'MyFile.pdf', label: 'Folder name', nodeId: '1' };
      const WithIcon = (args) =>
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(PreviewComponent, args);
      WithIcon.args = {
        children: 'MyFile.pdf',
        label: 'Folder name',
        nodeId: '1',
        icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__.PencilIcon,
          null,
        ),
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview', 'WithIcon'];
      (Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <PreviewComponent {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      }),
        (WithIcon.parameters = {
          ...WithIcon.parameters,
          docs: {
            ...WithIcon.parameters?.docs,
            source: {
              originalSource: '(args): React.ReactElement => <PreviewComponent {...args} />',
              ...WithIcon.parameters?.docs?.source,
            },
          },
        });
    },
    '../../../node_modules/classnames/index.js': (module, exports) => {
      var __WEBPACK_AMD_DEFINE_RESULT__;
      !(function () {
        'use strict';
        var hasOwn = {}.hasOwnProperty;
        function classNames() {
          for (var classes = '', i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            arg && (classes = appendClass(classes, parseValue(arg)));
          }
          return classes;
        }
        function parseValue(arg) {
          if ('string' == typeof arg || 'number' == typeof arg) return arg;
          if ('object' != typeof arg) return '';
          if (Array.isArray(arg)) return classNames.apply(null, arg);
          if (
            arg.toString !== Object.prototype.toString &&
            !arg.toString.toString().includes('[native code]')
          )
            return arg.toString();
          var classes = '';
          for (var key in arg)
            hasOwn.call(arg, key) && arg[key] && (classes = appendClass(classes, key));
          return classes;
        }
        function appendClass(value, newClass) {
          return newClass ? (value ? value + ' ' + newClass : value + newClass) : value;
        }
        module.exports
          ? ((classNames.default = classNames), (module.exports = classNames))
          : void 0 ===
              (__WEBPACK_AMD_DEFINE_RESULT__ = function () {
                return classNames;
              }.apply(exports, [])) || (module.exports = __WEBPACK_AMD_DEFINE_RESULT__);
      })();
    },
  },
]);
