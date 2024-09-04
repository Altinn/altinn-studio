/*! For license information please see components-StudioSpinner-StudioSpinner-stories.4a9d6e95.iframe.bundle.js.LICENSE.txt */
'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [1219],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Spinner/Spinner.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { y: () => Spinner });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        useIsomorphicLayoutEffect = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/hooks/useIsomorphicLayoutEffect.js',
        );
      const stashedTime = {};
      function useSynchronizedAnimation(animationName) {
        const ref = (0, react.useRef)(null);
        return (
          (0, useIsomorphicLayoutEffect.E)(() => {
            const animations = document
                .getAnimations()
                .filter(
                  (animation) =>
                    'animationName' in animation && animation.animationName === animationName,
                ),
              myAnimation = animations.find(
                (animation) => animation.effect?.target === ref.current,
              );
            return (
              myAnimation &&
                myAnimation === animations[0] &&
                stashedTime[animationName] &&
                (myAnimation.currentTime = stashedTime[animationName]),
              myAnimation &&
                myAnimation !== animations[0] &&
                (myAnimation.currentTime = animations[0].currentTime),
              () => {
                myAnimation &&
                  myAnimation === animations[0] &&
                  (stashedTime[animationName] = myAnimation.currentTime);
              }
            );
          }, [animationName]),
          ref
        );
      }
      const sizeMap = { '2xs': 13, xs: 20, sm: 27, md: 40, lg: 56, xl: 79 },
        Spinner = ({ title, variant = 'default', className, style, ...rest }) => {
          const size = (0, getSize.Y)(rest.size || 'md'),
            svgRef = useSynchronizedAnimation('fds-spinner-rotate-animation'),
            strokeRef = useSynchronizedAnimation('fds-spinner-stroke-animation');
          return (0, jsx_runtime.jsxs)('svg', {
            className: (0, lite.$)('fds-spinner', `fds-spinner--${variant}`, className),
            style: { width: sizeMap[size], height: sizeMap[size], ...style },
            viewBox: '0 0 50 50',
            ref: svgRef,
            ...rest,
            children: [
              (0, jsx_runtime.jsx)('title', { children: title }),
              (0, jsx_runtime.jsx)('circle', {
                className: (0, lite.$)(
                  'fds-spinner__background',
                  'inverted' === variant && 'fds-spinner__background--inverted',
                ),
                cx: '25',
                cy: '25',
                r: '20',
                fill: 'none',
                strokeWidth: '5',
              }),
              (0, jsx_runtime.jsx)('circle', {
                className: (0, lite.$)('fds-spinner__circle'),
                cx: '25',
                cy: '25',
                r: '20',
                fill: 'none',
                strokeWidth: '5',
                ref: strokeRef,
              }),
            ],
          });
        };
      Spinner.displayName = 'Spinner';
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/hooks/useIsomorphicLayoutEffect.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { E: () => useIsomorphicLayoutEffect });
        var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        );
        const useIsomorphicLayoutEffect =
          'undefined' != typeof window
            ? react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect
            : react__WEBPACK_IMPORTED_MODULE_0__.useEffect;
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
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
    './src/components/StudioSpinner/StudioSpinner.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { W: () => StudioSpinner });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        Spinner = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Spinner/Spinner.js',
        ),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
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
        StudioSpinner_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSpinner/StudioSpinner.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioSpinner_module.A, options);
      const StudioSpinner_StudioSpinner_module =
          StudioSpinner_module.A && StudioSpinner_module.A.locals
            ? StudioSpinner_module.A.locals
            : void 0,
        StudioSpinner = (0, react.forwardRef)(
          (
            {
              spinnerTitle,
              showSpinnerTitle = !1,
              size = 'medium',
              variant = 'interaction',
              ...rest
            },
            ref,
          ) => {
            const spinnerDescriptionId = (0, react.useId)();
            return react.createElement(
              'div',
              { className: StudioSpinner_StudioSpinner_module.spinnerWrapper, ref, ...rest },
              react.createElement(Spinner.y, {
                title: !showSpinnerTitle && spinnerTitle,
                size,
                variant,
                'aria-describedby': showSpinnerTitle ? spinnerDescriptionId : null,
                'data-testid': 'studio-spinner-test-id',
              }),
              showSpinnerTitle &&
                react.createElement(Paragraph.f, { id: spinnerDescriptionId }, spinnerTitle),
            );
          },
        );
      (StudioSpinner.displayName = 'StudioSpinner'),
        (StudioSpinner.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioSpinner',
          props: {
            showSpinnerTitle: { defaultValue: { value: 'false', computed: !1 }, required: !1 },
            size: { defaultValue: { value: "'medium'", computed: !1 }, required: !1 },
            variant: { defaultValue: { value: "'interaction'", computed: !1 }, required: !1 },
          },
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSpinner/StudioSpinner.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
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
          '.ycOrwEJXAP5HPX_wEwId {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: var(--fds-spacing-1);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioSpinner/StudioSpinner.module.css'],
            names: [],
            mappings: 'AAAA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,yBAAyB;AAC3B',
            sourcesContent: [
              '.spinnerWrapper {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: var(--fds-spacing-1);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { spinnerWrapper: 'ycOrwEJXAP5HPX_wEwId' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioSpinner/StudioSpinner.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _StudioSpinner__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioSpinner/StudioSpinner.tsx',
        );
      const meta = {
          title: 'StudioSpinner',
          component: _StudioSpinner__WEBPACK_IMPORTED_MODULE_1__.W,
          argTypes: {
            size: { control: 'radio', options: ['small', 'medium', 'large'] },
            variant: { control: 'radio', options: ['default', 'interaction', 'inverted'] },
          },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioSpinner__WEBPACK_IMPORTED_MODULE_1__.W,
            args,
          );
      Preview.args = {
        spinnerTitle: 'Text',
        showSpinnerTitle: !1,
        size: 'medium',
        variant: 'interaction',
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioSpinner {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
    '../../../node_modules/react/cjs/react-jsx-runtime.production.min.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
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
      module.exports = __webpack_require__(
        '../../../node_modules/react/cjs/react-jsx-runtime.production.min.js',
      );
    },
  },
]);
