/*! For license information please see components-StudioGridSelector-StudioGridSelector-mdx.7746d2ec.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [8957, 3911],
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
    './src/components/StudioGridSelector/StudioGridSelector.mdx': (
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
        _StudioGridSelector_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioGridSelector/StudioGridSelector.stories.tsx',
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
                { of: _StudioGridSelector_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioGridSelector',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioGridSelector is a component that allows the user to select a grid from a list of available\ngrid-values.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioGridSelector_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioGridSelector/StudioGridSelector.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { Y: () => StudioGridSelector });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
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
        StudioGridSelector_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioGridSelector/StudioGridSelector.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioGridSelector_module.A, options);
      const StudioGridSelector_StudioGridSelector_module =
        StudioGridSelector_module.A && StudioGridSelector_module.A.locals
          ? StudioGridSelector_module.A.locals
          : void 0;
      var classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames);
      const StudioGridSelector = ({ disabled = !1, sliderValue = 12, handleSliderChange }) => {
          const [hoverValue, setHoverValue] = (0, react.useState)(0),
            [selectedValue, setSelectedValue] = (0, react.useState)(sliderValue);
          (0, react.useEffect)(() => {
            setSelectedValue(sliderValue);
          }, [sliderValue]);
          const optionClassName = (gridValue) => {
              let variableClassName =
                gridValue > selectedValue
                  ? StudioGridSelector_StudioGridSelector_module.outside
                  : StudioGridSelector_StudioGridSelector_module.inside;
              return (
                hoverValue > 0 &&
                  (variableClassName =
                    gridValue > hoverValue
                      ? StudioGridSelector_StudioGridSelector_module.outside
                      : StudioGridSelector_StudioGridSelector_module.inside),
                classnames_default()(
                  StudioGridSelector_StudioGridSelector_module.option,
                  variableClassName,
                )
              );
            },
            sliderIsHovered = hoverValue > 0,
            backgroundCss =
              'linear-gradient(\n' +
              generateLinearGradient(
                sliderIsHovered ? hoverValue : selectedValue,
                sliderIsHovered,
              ) +
              ')',
            inputRef = (0, react.useRef)(null);
          return react.createElement(
            'div',
            {
              className: classnames_default()(
                StudioGridSelector_StudioGridSelector_module.sliderContainer,
                disabled && StudioGridSelector_StudioGridSelector_module.disabled,
              ),
              style: { '--background': backgroundCss },
            },
            react.createElement('input', {
              ref: inputRef,
              className: StudioGridSelector_StudioGridSelector_module.range,
              type: 'range',
              min: '1',
              max: '12',
              id: 'range',
              value: sliderValue,
              list: 'gridValues',
              onChange: (event) => handleSliderChange(convertToGridSize(event.target.value)),
              onInput: (event) => {
                setSelectedValue(parseInt(event.target.value)), setHoverValue(0);
              },
              disabled,
              onMouseMove: (event) => {
                const dataListElement = inputRef.current.list,
                  hoverOption = [...calculateOptionPositionsX(dataListElement)]
                    .reverse()
                    .find((optionPosX) => optionPosX.positionX < event.clientX);
                setHoverValue(hoverOption?.value || 0);
              },
              onMouseLeave: () => setHoverValue(0),
            }),
            react.createElement(
              'datalist',
              { id: 'gridValues' },
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((gridValue) =>
                react.createElement('option', {
                  key: gridValue,
                  value: gridValue,
                  label: gridValue.toString(),
                  className: optionClassName(gridValue),
                }),
              ),
            ),
          );
        },
        generateLinearGradient = (gridValue, hover) => {
          const gradientLines = ['to right'],
            insideColour = hover ? 'var(--hover-square-color)' : 'var(--selected-square-colour)',
            createStep = (option) => {
              const endSquarePosition = `calc((100% + 1px) * ${option} / 12 - 1px)`,
                squareColour =
                  option <= gridValue ? insideColour : 'var(--unselected-square-colour)';
              return [
                `${squareColour} ${`calc((100% + 1px) * ${option - 1} / 12)`}`,
                `${squareColour} ${endSquarePosition}`,
                `white ${endSquarePosition}`,
                `white ${`calc((100% + 1px) * ${option} / 12)`}`,
              ].join(',\n');
            };
          for (let i = 1; i <= 12; i++) gradientLines.push(createStep(i));
          return gradientLines.join(',\n');
        },
        convertToGridSize = (value) => parseInt(value),
        calculateOptionPositionsX = (datalistElement) => {
          if (datalistElement)
            return Array.from(datalistElement.options).map((option) => {
              const optionRect = option.getBoundingClientRect();
              return { value: parseInt(option.value), positionX: optionRect.x };
            });
        };
      StudioGridSelector.__docgenInfo = {
        description:
          '@component\n   A component designed for choosing a value within the range of 1 to 12',
        methods: [],
        displayName: 'StudioGridSelector',
        props: {
          disabled: {
            required: !1,
            tsType: { name: 'boolean' },
            description: '',
            defaultValue: { value: 'false', computed: !1 },
          },
          sliderValue: {
            required: !1,
            tsType: {
              name: 'union',
              raw: '1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12',
              elements: [
                { name: 'literal', value: '1' },
                { name: 'literal', value: '2' },
                { name: 'literal', value: '3' },
                { name: 'literal', value: '4' },
                { name: 'literal', value: '5' },
                { name: 'literal', value: '6' },
                { name: 'literal', value: '7' },
                { name: 'literal', value: '8' },
                { name: 'literal', value: '9' },
                { name: 'literal', value: '10' },
                { name: 'literal', value: '11' },
                { name: 'literal', value: '12' },
              ],
            },
            description: '',
            defaultValue: { value: '12', computed: !1 },
          },
          handleSliderChange: {
            required: !0,
            tsType: {
              name: 'signature',
              type: 'function',
              raw: '(newValue: GridSize) => void',
              signature: {
                arguments: [
                  {
                    type: {
                      name: 'union',
                      raw: '1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12',
                      elements: [
                        { name: 'literal', value: '1' },
                        { name: 'literal', value: '2' },
                        { name: 'literal', value: '3' },
                        { name: 'literal', value: '4' },
                        { name: 'literal', value: '5' },
                        { name: 'literal', value: '6' },
                        { name: 'literal', value: '7' },
                        { name: 'literal', value: '8' },
                        { name: 'literal', value: '9' },
                        { name: 'literal', value: '10' },
                        { name: 'literal', value: '11' },
                        { name: 'literal', value: '12' },
                      ],
                    },
                    name: 'newValue',
                  },
                ],
                return: { name: 'void' },
              },
            },
            description: '',
          },
        },
      };
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioGridSelector/StudioGridSelector.module.css':
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
          '.JvnZeoIUFPogXQuKv2xd {\n  position: relative;\n  --outline: 1px solid var(--fds-semantic-border-action-active);\n  --outline-offset: 1px;\n  --border-radius: var(--fds-border_radius-small);\n  --selected-square-colour: var(--fds-semantic-surface-action-second-default);\n  --unselected-square-colour: var(--fds-semantic-surface-action-second-no_fill-active);\n  --hover-square-color: var(--fds-semantic-surface-action-hover);\n  --thumb-width: calc(100% / 12);\n}\n\n.JvnZeoIUFPogXQuKv2xd.fwt_gqAU6WIV_lmYeLS_ {\n  opacity: var(--fds-opacity-disabled);\n}\n\n.GSq81ORblF1g8TgSIRh3 {\n  -webkit-appearance: none;\n  appearance: none;\n  aspect-ratio: 12;\n  border-radius: var(--border-radius);\n  box-sizing: border-box;\n  cursor: pointer;\n  margin: 0;\n  outline-offset: var(--outline-offset);\n  outline: var(--outline);\n  padding: 0;\n  width: 100%;\n}\n\n.GSq81ORblF1g8TgSIRh3:disabled {\n  --thumb-background-colour: var(--fds-semantic-border-neutral-default);\n  cursor: not-allowed;\n}\n\n.GSq81ORblF1g8TgSIRh3::-webkit-slider-runnable-track {\n  aspect-ratio: 12;\n  background: var(--background);\n  border-radius: var(--border-radius);\n}\n\n.GSq81ORblF1g8TgSIRh3::-moz-range-track {\n  aspect-ratio: 12;\n  background: var(--background);\n  border-radius: var(--border-radius);\n}\n\n.GSq81ORblF1g8TgSIRh3::-webkit-slider-thumb {\n  -webkit-appearance: none;\n  appearance: none;\n  width: var(--thumb-width);\n}\n\n.GSq81ORblF1g8TgSIRh3::-moz-range-thumb {\n  width: var(--thumb-width);\n}\n\ndatalist {\n  align-items: center;\n  aspect-ratio: 12;\n  border-radius: var(--border-radius);\n  color: white;\n  display: flex;\n  justify-content: space-around;\n  pointer-events: none;\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n\n.XOzj5kmmTantnVW2U29Q {\n  display: flex;\n  width: 100%;\n  text-align: center;\n  justify-content: center;\n  height: 100%;\n  align-items: center;\n}\n\n.XOzj5kmmTantnVW2U29Q:first-child {\n  border-top-left-radius: var(--border-radius);\n  border-bottom-left-radius: var(--border-radius);\n}\n\n.XOzj5kmmTantnVW2U29Q:last-child {\n  border-top-right-radius: var(--border-radius);\n  border-bottom-right-radius: var(--border-radius);\n}\n\n.XOzj5kmmTantnVW2U29Q.jLvZjHoCd_D09Vfmu_73 {\n  color: var(--fds-semantic-surface-action-second-default);\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioGridSelector/StudioGridSelector.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,kBAAkB;EAClB,6DAA6D;EAC7D,qBAAqB;EACrB,+CAA+C;EAC/C,2EAA2E;EAC3E,oFAAoF;EACpF,8DAA8D;EAC9D,8BAA8B;AAChC;;AAEA;EACE,oCAAoC;AACtC;;AAEA;EACE,wBAAwB;EACxB,gBAAgB;EAChB,gBAAgB;EAChB,mCAAmC;EACnC,sBAAsB;EACtB,eAAe;EACf,SAAS;EACT,qCAAqC;EACrC,uBAAuB;EACvB,UAAU;EACV,WAAW;AACb;;AAEA;EACE,qEAAqE;EACrE,mBAAmB;AACrB;;AAEA;EACE,gBAAgB;EAChB,6BAA6B;EAC7B,mCAAmC;AACrC;;AAEA;EACE,gBAAgB;EAChB,6BAA6B;EAC7B,mCAAmC;AACrC;;AAEA;EACE,wBAAwB;EACxB,gBAAgB;EAChB,yBAAyB;AAC3B;;AAEA;EACE,yBAAyB;AAC3B;;AAEA;EACE,mBAAmB;EACnB,gBAAgB;EAChB,mCAAmC;EACnC,YAAY;EACZ,aAAa;EACb,6BAA6B;EAC7B,oBAAoB;EACpB,kBAAkB;EAClB,MAAM;EACN,WAAW;AACb;;AAEA;EACE,aAAa;EACb,WAAW;EACX,kBAAkB;EAClB,uBAAuB;EACvB,YAAY;EACZ,mBAAmB;AACrB;;AAEA;EACE,4CAA4C;EAC5C,+CAA+C;AACjD;;AAEA;EACE,6CAA6C;EAC7C,gDAAgD;AAClD;;AAEA;EACE,wDAAwD;AAC1D',
            sourcesContent: [
              '.sliderContainer {\n  position: relative;\n  --outline: 1px solid var(--fds-semantic-border-action-active);\n  --outline-offset: 1px;\n  --border-radius: var(--fds-border_radius-small);\n  --selected-square-colour: var(--fds-semantic-surface-action-second-default);\n  --unselected-square-colour: var(--fds-semantic-surface-action-second-no_fill-active);\n  --hover-square-color: var(--fds-semantic-surface-action-hover);\n  --thumb-width: calc(100% / 12);\n}\n\n.sliderContainer.disabled {\n  opacity: var(--fds-opacity-disabled);\n}\n\n.range {\n  -webkit-appearance: none;\n  appearance: none;\n  aspect-ratio: 12;\n  border-radius: var(--border-radius);\n  box-sizing: border-box;\n  cursor: pointer;\n  margin: 0;\n  outline-offset: var(--outline-offset);\n  outline: var(--outline);\n  padding: 0;\n  width: 100%;\n}\n\n.range:disabled {\n  --thumb-background-colour: var(--fds-semantic-border-neutral-default);\n  cursor: not-allowed;\n}\n\n.range::-webkit-slider-runnable-track {\n  aspect-ratio: 12;\n  background: var(--background);\n  border-radius: var(--border-radius);\n}\n\n.range::-moz-range-track {\n  aspect-ratio: 12;\n  background: var(--background);\n  border-radius: var(--border-radius);\n}\n\n.range::-webkit-slider-thumb {\n  -webkit-appearance: none;\n  appearance: none;\n  width: var(--thumb-width);\n}\n\n.range::-moz-range-thumb {\n  width: var(--thumb-width);\n}\n\ndatalist {\n  align-items: center;\n  aspect-ratio: 12;\n  border-radius: var(--border-radius);\n  color: white;\n  display: flex;\n  justify-content: space-around;\n  pointer-events: none;\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n\n.option {\n  display: flex;\n  width: 100%;\n  text-align: center;\n  justify-content: center;\n  height: 100%;\n  align-items: center;\n}\n\n.option:first-child {\n  border-top-left-radius: var(--border-radius);\n  border-bottom-left-radius: var(--border-radius);\n}\n\n.option:last-child {\n  border-top-right-radius: var(--border-radius);\n  border-bottom-right-radius: var(--border-radius);\n}\n\n.option.outside {\n  color: var(--fds-semantic-surface-action-second-default);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            sliderContainer: 'JvnZeoIUFPogXQuKv2xd',
            disabled: 'fwt_gqAU6WIV_lmYeLS_',
            range: 'GSq81ORblF1g8TgSIRh3',
            option: 'XOzj5kmmTantnVW2U29Q',
            outside: 'jLvZjHoCd_D09Vfmu_73',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioGridSelector/StudioGridSelector.stories.tsx': (
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
        _StudioGridSelector__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioGridSelector/StudioGridSelector.tsx',
        );
      const meta = {
          title: 'StudioGridSelector',
          component: _StudioGridSelector__WEBPACK_IMPORTED_MODULE_1__.Y,
          argTypes: {
            sliderValue: { control: 'select', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
          },
          parameters: { actions: { argTypesRegex: 'handleSliderChange' } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioGridSelector__WEBPACK_IMPORTED_MODULE_1__.Y,
            args,
          );
      Preview.args = { sliderValue: 0, disabled: !1 };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioGridSelector {...args} />',
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
