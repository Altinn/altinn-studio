/*! For license information please see components-StudioDeleteButton-StudioDeleteButton-mdx.e54e4180.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6757, 7039],
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
    './src/components/StudioDeleteButton/StudioDeleteButton.mdx': (
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
        _StudioDeleteButton_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioDeleteButton/StudioDeleteButton.stories.tsx',
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
                { of: _StudioDeleteButton_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioDeleteButton',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: "StudioDeleteButton it's a button for handle delete actions in studio.",
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioDeleteButton_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioButton/StudioButton.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { r: () => StudioButton });
      var Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames),
        injectStylesIntoStyleTag = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js',
        ),
        injectStylesIntoStyleTag_default = __webpack_require__.n(injectStylesIntoStyleTag),
        styleDomAPI = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleDomAPI.js',
        ),
        styleDomAPI_default = __webpack_require__.n(styleDomAPI),
        insertBySelector = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertBySelector.js',
        ),
        insertBySelector_default = __webpack_require__.n(insertBySelector),
        setAttributesWithoutAttributes = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js',
        ),
        setAttributesWithoutAttributes_default = __webpack_require__.n(
          setAttributesWithoutAttributes,
        ),
        insertStyleElement = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertStyleElement.js',
        ),
        insertStyleElement_default = __webpack_require__.n(insertStyleElement),
        styleTagTransform = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleTagTransform.js',
        ),
        styleTagTransform_default = __webpack_require__.n(styleTagTransform),
        StudioButton_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioButton_module.A, options);
      const StudioButton_StudioButton_module =
          StudioButton_module.A && StudioButton_module.A.locals
            ? StudioButton_module.A.locals
            : void 0,
        StudioButton = (0, react.forwardRef)(
          (
            {
              icon,
              iconPlacement = 'left',
              size = 'small',
              children,
              className: givenClassName,
              color,
              ...rest
            },
            ref,
          ) => {
            const iconComponent = react.createElement(
                'span',
                { 'aria-hidden': !0, className: StudioButton_StudioButton_module.iconWrapper },
                icon,
              ),
              classNames = classnames_default()(
                givenClassName,
                StudioButton_StudioButton_module.studioButton,
                {
                  [StudioButton_StudioButton_module.inverted]: 'inverted' === color,
                  [StudioButton_StudioButton_module.small]: 'small' === size,
                },
              ),
              selectedColor = 'inverted' === color ? void 0 : color;
            return react.createElement(
              Button.$,
              { ...rest, color: selectedColor, className: classNames, icon: !children, size, ref },
              icon
                ? react.createElement(
                    'span',
                    { className: StudioButton_StudioButton_module.innerContainer },
                    'left' === iconPlacement && iconComponent,
                    children,
                    'right' === iconPlacement && iconComponent,
                  )
                : children,
            );
          },
        );
      (StudioButton.displayName = 'StudioButton'),
        (StudioButton.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioButton',
          props: {
            iconPlacement: { defaultValue: { value: "'left'", computed: !1 }, required: !1 },
            size: { defaultValue: { value: "'small'", computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioButton/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, {
        r: () => _StudioButton__WEBPACK_IMPORTED_MODULE_0__.r,
      });
      var _StudioButton__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioButton/StudioButton.tsx',
      );
    },
    './src/components/StudioDeleteButton/StudioDeleteButton.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { W: () => StudioDeleteButton });
      var _StudioButton__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          './src/components/StudioButton/index.ts',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const StudioDeleteButton = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        ({ confirmMessage, onClick, onDelete, ...rest }, ref) =>
          react__WEBPACK_IMPORTED_MODULE_1__.createElement(
            _StudioButton__WEBPACK_IMPORTED_MODULE_0__.r,
            {
              color: 'danger',
              icon: react__WEBPACK_IMPORTED_MODULE_1__.createElement(
                _studio_icons__WEBPACK_IMPORTED_MODULE_2__.TrashIcon,
                null,
              ),
              onClick: (event) => {
                onClick?.(event), (confirmMessage && !confirm(confirmMessage)) || onDelete();
              },
              variant: 'secondary',
              ...rest,
              ref,
            },
          ),
      );
      (StudioDeleteButton.displayName = 'StudioDeleteButton'),
        (StudioDeleteButton.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioDeleteButton',
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/sourceMaps.js',
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default =
            __webpack_require__.n(
              _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__,
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/api.js',
            ),
          ___CSS_LOADER_EXPORT___ = __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__,
          )()(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default(),
          );
        ___CSS_LOADER_EXPORT___.push([
          module.id,
          '.VsljBaht8yIHfQNncszf {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.pLTIwGuCRUzQbPzUljBE {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.nohkVRNOJdkmSdRVeuOQ {\n  display: contents;\n}\n\n.xfxnTjsHc_MM1EarWiUH {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.xfxnTjsHc_MM1EarWiUH:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.bJsmp0K5zJOZVdUgNX9V {\n  min-height: var(--fds-sizing-8);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioButton/StudioButton.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,oBAAoB;EACpB,yBAAyB;AAC3B;;AAEA;EACE,aAAa;EACb,mBAAmB;EACnB,yBAAyB;AAC3B;;AAEA;EACE,iBAAiB;AACnB;;AAEA;EACE,mDAAmD;EACnD,uBAAuB;AACzB;;AAEA;EACE,iEAAiE;AACnE;;AAEA;EACE,+BAA+B;AACjC',
            sourcesContent: [
              '.studioButton {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.innerContainer {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.iconWrapper {\n  display: contents;\n}\n\n.inverted {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.inverted:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.small {\n  min-height: var(--fds-sizing-8);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            studioButton: 'VsljBaht8yIHfQNncszf',
            innerContainer: 'pLTIwGuCRUzQbPzUljBE',
            iconWrapper: 'nohkVRNOJdkmSdRVeuOQ',
            inverted: 'xfxnTjsHc_MM1EarWiUH',
            small: 'bJsmp0K5zJOZVdUgNX9V',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioDeleteButton/StudioDeleteButton.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _StudioDeleteButton__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioDeleteButton/StudioDeleteButton.tsx',
        );
      const meta = {
          title: 'StudioDeleteButton',
          component: _StudioDeleteButton__WEBPACK_IMPORTED_MODULE_1__.W,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioDeleteButton__WEBPACK_IMPORTED_MODULE_1__.W,
            args,
          );
      Preview.args = { confirmMessage: 'Are you sure you want to delete this item?' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioDeleteButton {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
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
