/*! For license information please see components-StudioBooleanToggleGroup-StudioBooleanToggleGroup-stories.db962626.iframe.bundle.js.LICENSE.txt */
'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [4055],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/ToggleGroup/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { O: () => ToggleGroup_ToggleGroup });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        RovingTabindexRoot = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexRoot.js',
        );
      const ToggleGroupContext = (0, react.createContext)({}),
        ToggleGroup = (0, react.forwardRef)(
          ({ children, value, defaultValue, onChange, name, className, ...rest }, ref) => {
            const size = (0, getSize.Y)(rest.size || 'md'),
              nameId = (0, react.useId)(),
              isControlled = void 0 !== value,
              [uncontrolledValue, setUncontrolledValue] = (0, react.useState)(defaultValue);
            let onValueChange = onChange;
            return (
              isControlled ||
                ((onValueChange = (newValue) => {
                  setUncontrolledValue(newValue), onChange?.(newValue);
                }),
                (value = uncontrolledValue)),
              (0, jsx_runtime.jsx)('div', {
                className: (0, lite.$)('fds-togglegroup', className),
                ref,
                ...rest,
                children: (0, jsx_runtime.jsxs)(ToggleGroupContext.Provider, {
                  value: {
                    value,
                    defaultValue,
                    name: name ?? `togglegroup-name-${nameId}`,
                    onChange: onValueChange,
                    size,
                  },
                  children: [
                    name &&
                      (0, jsx_runtime.jsx)('input', {
                        className: 'fds-togglegroup__input',
                        name,
                        value,
                      }),
                    (0, jsx_runtime.jsx)(RovingTabindexRoot.D, {
                      asChild: !0,
                      valueId: value,
                      children: (0, jsx_runtime.jsx)('div', {
                        className: 'fds-togglegroup__content',
                        role: 'radiogroup',
                        children,
                      }),
                    }),
                  ],
                }),
              })
            );
          },
        );
      ToggleGroup.displayName = 'ToggleGroup';
      var RovingTabindexItem = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexItem.js',
        ),
        Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        );
      const ToggleGroupItem = (0, react.forwardRef)((props, ref) => {
        const { children, icon, className, ...rest } = props,
          {
            active,
            size = 'md',
            buttonProps,
          } = ((props) => {
            const { ...rest } = props,
              toggleGroup = (0, react.useContext)(ToggleGroupContext),
              itemValue = props.value ?? ('string' == typeof props.children ? props.children : ''),
              active = toggleGroup.value == itemValue,
              buttonId = `togglegroup-item-${(0, react.useId)()}`;
            return {
              ...rest,
              active,
              size: toggleGroup?.size,
              buttonProps: {
                id: buttonId,
                'aria-checked': active,
                'aria-current': active,
                role: 'radio',
                name: toggleGroup.name,
                onClick: () => {
                  toggleGroup.onChange?.(itemValue);
                },
              },
            };
          })(props);
        return (0, jsx_runtime.jsx)(RovingTabindexItem.o_, {
          asChild: !0,
          value: rest.value,
          children: (0, jsx_runtime.jsx)(Button.$, {
            className: (0, lite.$)('fds-togglegroup__item', className),
            icon,
            color: 'first',
            variant: active ? 'primary' : 'tertiary',
            size,
            ref,
            ...rest,
            ...buttonProps,
            children,
          }),
        });
      });
      ToggleGroupItem.displayName = 'ToggleGroupItem';
      const ToggleGroup_ToggleGroup = ToggleGroup;
      (ToggleGroup_ToggleGroup.Item = ToggleGroupItem),
        (ToggleGroup_ToggleGroup.Item.displayName = 'ToggleGroup.Item');
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexItem.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { o_: () => RovingTabindexItem });
        var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          floating_ui_react = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js',
          ),
          dist = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          ),
          RovingTabindexRoot = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexRoot.js',
          );
        const RovingTabindexItem = (0, react.forwardRef)(({ value, asChild, ...rest }, ref) => {
          const Component = asChild ? dist.D : 'div',
            focusValue = value ?? ('string' == typeof rest.children ? rest.children : ''),
            { getOrderedItems, getRovingProps } = ((value) => {
              const { elements, getOrderedItems, setFocusableValue, focusableValue, onShiftTab } =
                (0, react.useContext)(RovingTabindexRoot.c);
              return {
                getOrderedItems,
                isFocusable: focusableValue === value,
                getRovingProps: (props) => ({
                  ...props,
                  ref: (element) => {
                    element ? elements.current.set(value, element) : elements.current.delete(value);
                  },
                  onKeyDown: (e) => {
                    props?.onKeyDown?.(e), e.shiftKey && 'Tab' === e.key && onShiftTab();
                  },
                  onFocus: (e) => {
                    props?.onFocus?.(e), setFocusableValue(value);
                  },
                  'data-roving-tabindex-item': !0,
                  tabIndex: focusableValue === value ? 0 : -1,
                }),
              };
            })(focusValue),
            rovingProps = getRovingProps({
              onKeyDown: (e) => {
                rest?.onKeyDown?.(e);
                const items = getOrderedItems();
                let nextItem;
                'ArrowRight' === e.key &&
                  (nextItem = (function getNextFocusableValue(items, value) {
                    const currIndex = items.findIndex((item) => item.value === value);
                    return items.at(currIndex === items.length - 1 ? 0 : currIndex + 1);
                  })(items, focusValue)),
                  'ArrowLeft' === e.key &&
                    (nextItem = (function getPrevFocusableValue(items, value) {
                      const currIndex = items.findIndex((item) => item.value === value);
                      return items.at(0 === currIndex ? -1 : currIndex - 1);
                    })(items, focusValue)),
                  nextItem?.element.focus();
              },
            }),
            mergedRefs = (0, floating_ui_react.SV)([ref, rovingProps.ref]);
          return (0, jsx_runtime.jsx)(Component, {
            ...rest,
            ...rovingProps,
            ref: mergedRefs,
            children: rest.children,
          });
        });
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexRoot.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, {
          D: () => RovingTabindexRoot,
          c: () => RovingTabindexContext,
        });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _node_modules_floating_ui_react_dist_floating_ui_react_js__WEBPACK_IMPORTED_MODULE_3__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js',
            ),
          _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
            );
        const RovingTabindexContext = (0, react__WEBPACK_IMPORTED_MODULE_1__.createContext)({
            elements: { current: new Map() },
            getOrderedItems: () => [],
            setFocusableValue: () => {},
            onShiftTab: () => {},
            focusableValue: null,
          }),
          RovingTabindexRoot = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
            ({ valueId, asChild, onBlur, onFocus, ...rest }, ref) => {
              const Component = asChild
                  ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                  : 'div',
                [focusableValue, setFocusableValue] = (0,
                react__WEBPACK_IMPORTED_MODULE_1__.useState)(null),
                [isShiftTabbing, setIsShiftTabbing] = (0,
                react__WEBPACK_IMPORTED_MODULE_1__.useState)(!1),
                elements = (0, react__WEBPACK_IMPORTED_MODULE_1__.useRef)(new Map()),
                myRef = (0, react__WEBPACK_IMPORTED_MODULE_1__.useRef)(),
                refs = (0,
                _node_modules_floating_ui_react_dist_floating_ui_react_js__WEBPACK_IMPORTED_MODULE_3__.SV)(
                  [ref, myRef],
                ),
                getOrderedItems = () => {
                  if (!myRef.current) return [];
                  const elementsFromDOM = Array.from(
                    myRef.current.querySelectorAll('[data-roving-tabindex-item]'),
                  );
                  return Array.from(elements.current)
                    .sort((a, b) => elementsFromDOM.indexOf(a[1]) - elementsFromDOM.indexOf(b[1]))
                    .map(([value, element]) => ({ value, element }));
                };
              return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
                RovingTabindexContext.Provider,
                {
                  value: {
                    elements,
                    getOrderedItems,
                    focusableValue,
                    setFocusableValue,
                    onShiftTab: () => {
                      setIsShiftTabbing(!0);
                    },
                  },
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
                    ...rest,
                    tabIndex: isShiftTabbing ? -1 : 0,
                    onBlur: (e) => {
                      onBlur?.(e), setIsShiftTabbing(!1);
                    },
                    onFocus: (e) => {
                      if ((onFocus?.(e), e.target !== e.currentTarget)) return;
                      const orderedItems = getOrderedItems();
                      0 !== orderedItems.length &&
                        (null != focusableValue
                          ? elements.current.get(focusableValue)?.focus()
                          : null != valueId
                            ? elements.current.get(valueId)?.focus()
                            : orderedItems.at(0)?.element.focus());
                    },
                    ref: refs,
                  }),
                },
              );
            },
          );
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
    './src/components/StudioBooleanToggleGroup/StudioBooleanToggleGroup.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { y: () => StudioBooleanToggleGroup });
      var _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/ToggleGroup/index.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        );
      const StudioBooleanToggleGroup = (0, react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
        ({ falseLabel, onChange, trueLabel, value: givenValue, ...rest }, ref) => {
          const [value, setValue] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
            givenValue ?? !1,
          );
          (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
            setValue(givenValue ?? !1);
          }, [givenValue]);
          return react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.O,
            {
              ...rest,
              onChange: (stringValue) => {
                const newValue = 'true' === stringValue;
                setValue(newValue), onChange?.(newValue);
              },
              value: value ? 'true' : 'false',
              ref,
            },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.O.Item,
              { value: 'true' },
              trueLabel,
            ),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.O.Item,
              { value: 'false' },
              falseLabel,
            ),
          );
        },
      );
      (StudioBooleanToggleGroup.displayName = 'StudioBooleanToggleGroup'),
        (StudioBooleanToggleGroup.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioBooleanToggleGroup',
        });
    },
    './src/components/StudioBooleanToggleGroup/StudioBooleanToggleGroup.stories.tsx': (
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
        _StudioBooleanToggleGroup__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioBooleanToggleGroup/StudioBooleanToggleGroup.tsx',
        );
      const __WEBPACK_DEFAULT_EXPORT__ = {
          title: 'StudioBooleanToggleGroup',
          component: _StudioBooleanToggleGroup__WEBPACK_IMPORTED_MODULE_1__.y,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioBooleanToggleGroup__WEBPACK_IMPORTED_MODULE_1__.y,
            args,
          );
      Preview.args = { value: !1, trueLabel: 'Yes', falseLabel: 'No' };
      const __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              'args => <StudioBooleanToggleGroup {...args}></StudioBooleanToggleGroup>',
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
