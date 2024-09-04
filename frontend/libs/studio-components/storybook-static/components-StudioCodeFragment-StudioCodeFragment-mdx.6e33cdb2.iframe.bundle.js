/*! For license information please see components-StudioCodeFragment-StudioCodeFragment-mdx.6e33cdb2.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [4837, 9599],
  {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        function _extends() {
          return (
            (_extends = Object.assign
              ? Object.assign.bind()
              : function (target) {
                  for (var i = 1; i < arguments.length; i++) {
                    var source = arguments[i];
                    for (var key in source)
                      Object.prototype.hasOwnProperty.call(source, key) &&
                        (target[key] = source[key]);
                  }
                  return target;
                }),
            _extends.apply(this, arguments)
          );
        }
        __webpack_require__.d(__webpack_exports__, {
          D: () => $5e63c961fc1ce211$export$8c6ed5c666ac1360,
        });
        var react = __webpack_require__('../../../node_modules/react/index.js');
        function $6ed0406888f73fc4$export$43e446d32b3d21af(...refs) {
          return (node) =>
            refs.forEach((ref) =>
              (function $6ed0406888f73fc4$var$setRef(ref, value) {
                'function' == typeof ref ? ref(value) : null != ref && (ref.current = value);
              })(ref, node),
            );
        }
        const $5e63c961fc1ce211$export$8c6ed5c666ac1360 = (0, react.forwardRef)(
          (props, forwardedRef) => {
            const { children, ...slotProps } = props,
              childrenArray = react.Children.toArray(children),
              slottable = childrenArray.find($5e63c961fc1ce211$var$isSlottable);
            if (slottable) {
              const newElement = slottable.props.children,
                newChildren = childrenArray.map((child) =>
                  child === slottable
                    ? react.Children.count(newElement) > 1
                      ? react.Children.only(null)
                      : (0, react.isValidElement)(newElement)
                        ? newElement.props.children
                        : null
                    : child,
                );
              return (0, react.createElement)(
                $5e63c961fc1ce211$var$SlotClone,
                _extends({}, slotProps, { ref: forwardedRef }),
                (0, react.isValidElement)(newElement)
                  ? (0, react.cloneElement)(newElement, void 0, newChildren)
                  : null,
              );
            }
            return (0, react.createElement)(
              $5e63c961fc1ce211$var$SlotClone,
              _extends({}, slotProps, { ref: forwardedRef }),
              children,
            );
          },
        );
        $5e63c961fc1ce211$export$8c6ed5c666ac1360.displayName = 'Slot';
        const $5e63c961fc1ce211$var$SlotClone = (0, react.forwardRef)((props, forwardedRef) => {
          const { children, ...slotProps } = props;
          return (0, react.isValidElement)(children)
            ? (0, react.cloneElement)(children, {
                ...$5e63c961fc1ce211$var$mergeProps(slotProps, children.props),
                ref: forwardedRef
                  ? $6ed0406888f73fc4$export$43e446d32b3d21af(forwardedRef, children.ref)
                  : children.ref,
              })
            : react.Children.count(children) > 1
              ? react.Children.only(null)
              : null;
        });
        $5e63c961fc1ce211$var$SlotClone.displayName = 'SlotClone';
        const $5e63c961fc1ce211$export$d9f1ccf0bdb05d45 = ({ children }) =>
          (0, react.createElement)(react.Fragment, null, children);
        function $5e63c961fc1ce211$var$isSlottable(child) {
          return (
            (0, react.isValidElement)(child) &&
            child.type === $5e63c961fc1ce211$export$d9f1ccf0bdb05d45
          );
        }
        function $5e63c961fc1ce211$var$mergeProps(slotProps, childProps) {
          const overrideProps = { ...childProps };
          for (const propName in childProps) {
            const slotPropValue = slotProps[propName],
              childPropValue = childProps[propName];
            /^on[A-Z]/.test(propName)
              ? slotPropValue && childPropValue
                ? (overrideProps[propName] = (...args) => {
                    childPropValue(...args), slotPropValue(...args);
                  })
                : slotPropValue && (overrideProps[propName] = slotPropValue)
              : 'style' === propName
                ? (overrideProps[propName] = { ...slotPropValue, ...childPropValue })
                : 'className' === propName &&
                  (overrideProps[propName] = [slotPropValue, childPropValue]
                    .filter(Boolean)
                    .join(' '));
          }
          return { ...slotProps, ...overrideProps };
        }
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      function clsx() {
        for (var t, r = 0, e = '', n = arguments.length; r < n; r++)
          (t = arguments[r]) && 'string' == typeof t && (e += (e && ' ') + t);
        return e;
      }
      __webpack_require__.d(__webpack_exports__, { $: () => clsx });
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      function getSize(size) {
        switch (size) {
          case 'xxxsmall':
            return '3xs';
          case 'xxsmall':
            return '2xs';
          case 'xsmall':
            return 'xs';
          case 'small':
            return 'sm';
          case 'medium':
            return 'md';
          case 'large':
            return 'lg';
          case 'xlarge':
            return 'xl';
          case 'xxlarge':
          case '2xlarge':
            return '2xl';
          case 'xxxlarge':
          case '3xlarge':
            return '3xl';
          case 'xxxxlarge':
            return '4xl';
          default:
            return size;
        }
      }
      __webpack_require__.d(__webpack_exports__, { Y: () => getSize });
    },
    './src/components/StudioCodeFragment/StudioCodeFragment.mdx': (
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
        _StudioCodeFragment_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioCodeFragment/StudioCodeFragment.stories.tsx',
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
                { of: _StudioCodeFragment_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioCodeFragment',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioCodeFragment is a component that renders a code fragment in a styled box.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioCodeFragment_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioCodeFragment/StudioCodeFragment.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { o: () => StudioCodeFragment });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
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
        StudioCodeFragment_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioCodeFragment/StudioCodeFragment.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioCodeFragment_module.A, options);
      const StudioCodeFragment_StudioCodeFragment_module =
          StudioCodeFragment_module.A && StudioCodeFragment_module.A.locals
            ? StudioCodeFragment_module.A.locals
            : void 0,
        StudioCodeFragment = (0, react.forwardRef)(
          ({ children, className: givenClass, ...rest }, ref) => {
            const className = classnames_default()(
              StudioCodeFragment_StudioCodeFragment_module.code,
              givenClass,
            );
            return react.createElement('code', { className, ...rest, ref }, children);
          },
        );
      (StudioCodeFragment.displayName = 'StudioCodeFragment'),
        (StudioCodeFragment.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioCodeFragment',
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioCodeFragment/StudioCodeFragment.module.css':
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
          ".JgCEdzE5cHln1_Du1XTg {\n  flex: 1;\n  background-color: var(--fds-semantic-surface-neutral-subtle);\n  border: 1px solid var(--fds-semantic-border-neutral-subtle);\n  border-radius: var(--fds-border_radius-small);\n  font-family: 'Courier New', monospace;\n  font-size: 0.8em;\n  padding: 0 var(--fds-spacing-1);\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n",
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioCodeFragment/StudioCodeFragment.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,OAAO;EACP,4DAA4D;EAC5D,2DAA2D;EAC3D,6CAA6C;EAC7C,qCAAqC;EACrC,gBAAgB;EAChB,+BAA+B;EAC/B,gBAAgB;EAChB,uBAAuB;AACzB',
            sourcesContent: [
              ".code {\n  flex: 1;\n  background-color: var(--fds-semantic-surface-neutral-subtle);\n  border: 1px solid var(--fds-semantic-border-neutral-subtle);\n  border-radius: var(--fds-border_radius-small);\n  font-family: 'Courier New', monospace;\n  font-size: 0.8em;\n  padding: 0 var(--fds-spacing-1);\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n",
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { code: 'JgCEdzE5cHln1_Du1XTg' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioCodeFragment/StudioCodeFragment.stories.tsx': (
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
        _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioCodeFragment/StudioCodeFragment.tsx',
        );
      const __WEBPACK_DEFAULT_EXPORT__ = {
          title: 'StudioCodeFragment',
          component: _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__.o,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__.o,
            args,
          );
      Preview.args = {
        children: 'Please use the h1-tag like this: <h1>This is the main title</h1>',
      };
      const __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: 'args => <StudioCodeFragment {...args}></StudioCodeFragment>',
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
    '../../../node_modules/react/cjs/react-jsx-runtime.production.min.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      'use strict';
      var f = __webpack_require__('../../../node_modules/react/index.js'),
        k = Symbol.for('react.element'),
        l = Symbol.for('react.fragment'),
        m = Object.prototype.hasOwnProperty,
        n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
        p = { key: !0, ref: !0, __self: !0, __source: !0 };
      function q(c, a, g) {
        var b,
          d = {},
          e = null,
          h = null;
        for (b in (void 0 !== g && (e = '' + g),
        void 0 !== a.key && (e = '' + a.key),
        void 0 !== a.ref && (h = a.ref),
        a))
          m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
        if (c && c.defaultProps) for (b in (a = c.defaultProps)) void 0 === d[b] && (d[b] = a[b]);
        return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
      }
      (exports.Fragment = l), (exports.jsx = q), (exports.jsxs = q);
    },
    '../../../node_modules/react/jsx-runtime.js': (
      module,
      __unused_webpack_exports,
      __webpack_require__,
    ) => {
      'use strict';
      module.exports = __webpack_require__(
        '../../../node_modules/react/cjs/react-jsx-runtime.production.min.js',
      );
    },
  },
]);
