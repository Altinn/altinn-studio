/*! For license information please see components-StudioNativeSelect-StudioNativeSelect-stories.0da26c86.iframe.bundle.js.LICENSE.txt */
'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [199],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { K: () => ErrorMessage });
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
        const ErrorMessage = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ className, spacing, asChild, error = !0, ...rest }, ref) => {
            const Component = asChild
                ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                : 'div',
              size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__.Y)(rest.size || 'md');
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
              ref,
              className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                'fds-error-message',
                `fds-error-message--${size}`,
                spacing && 'fds-error-message--spacing',
                error && 'fds-error-message--error',
                className,
              ),
              ...rest,
            });
          },
        );
        ErrorMessage.displayName = 'ErrorMessage';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { J: () => Label });
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
        const Label = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ className, spacing, weight = 'medium', asChild, ...rest }, ref) => {
            const Component = asChild
                ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                : 'label',
              size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__.Y)(rest.size || 'md');
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
              ref,
              className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                'fds-label',
                `fds-label--${size}`,
                spacing && 'fds-label--spacing',
                weight && `fds-label--${weight}-weight`,
                className,
              ),
              ...rest,
            });
          },
        );
        Label.displayName = 'Label';
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/FieldsetContext.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { S: () => FieldsetContext });
        const FieldsetContext = (0,
        __webpack_require__('../../../node_modules/react/index.js').createContext)(null);
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/NativeSelect/NativeSelect.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { m: () => NativeSelect });
        var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          lite = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          PadlockLockedFill = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js',
          ),
          useFormField = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/useFormField.js',
          ),
          FieldsetContext = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/FieldsetContext.js',
          ),
          getSize = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
          );
        var Label = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
          ),
          objectUtils = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/objectUtils.js',
          ),
          ErrorMessage = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
          ),
          Paragraph = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
          );
        const NativeSelect = (0, react.forwardRef)((props, ref) => {
          const {
              children,
              disabled = !1,
              label,
              description,
              hideLabel = !1,
              error,
              className,
              htmlSize = 0,
              ...rest
            } = props,
            {
              selectProps,
              descriptionId,
              errorId,
              readOnly = !1,
              size = 'md',
            } = ((props) => {
              const fieldset = (0, react.useContext)(FieldsetContext.S),
                {
                  inputProps: selectProps,
                  readOnly,
                  ...rest
                } = (0, useFormField.W)(props, 'select'),
                size = (0, getSize.Y)(fieldset?.size ?? props.size ?? 'md');
              return {
                ...rest,
                readOnly,
                size,
                selectProps: {
                  ...selectProps,
                  readOnly,
                  onClick: (e) => {
                    readOnly ? e.preventDefault() : props?.onClick?.(e);
                  },
                  onChange: (e) => {
                    readOnly ? e.preventDefault() : props?.onChange?.(e);
                  },
                },
              };
            })(props);
          return (0, jsx_runtime.jsx)(Paragraph.f, {
            asChild: !0,
            size,
            children: (0, jsx_runtime.jsxs)('div', {
              className: (0, lite.$)(
                'fds-native-select--container',
                readOnly && 'fds-native-select--readonly',
                error && 'fds-native-select--error',
              ),
              children: [
                label &&
                  (0, jsx_runtime.jsxs)(Label.J, {
                    weight: 'medium',
                    size,
                    htmlFor: selectProps.id,
                    className: (0, lite.$)('fds-native-select__label', hideLabel && 'fds-sr-only'),
                    children: [
                      readOnly &&
                        (0, jsx_runtime.jsx)(PadlockLockedFill.A, {
                          'aria-hidden': !0,
                          className: 'fds-native-select__readonly__icon',
                        }),
                      label,
                    ],
                  }),
                description &&
                  (0, jsx_runtime.jsx)(Paragraph.f, {
                    asChild: !0,
                    size,
                    children: (0, jsx_runtime.jsx)('div', {
                      id: descriptionId,
                      className: (0, lite.$)(
                        'fds-native-select__description',
                        hideLabel && 'fds-sr-only',
                      ),
                      children: description,
                    }),
                  }),
                (0, jsx_runtime.jsx)('select', {
                  disabled: disabled || readOnly,
                  ref,
                  size: htmlSize,
                  className: (0, lite.$)(
                    'fds-native-select',
                    `fds-native-select--${size}`,
                    'fds-focus',
                    props.multiple && 'fds-native-select--multiple',
                    className,
                  ),
                  ...(0, objectUtils.c)(['size', 'error', 'errorId'], rest),
                  ...(0, objectUtils.c)(['readOnly', 'disabled'], selectProps),
                  children,
                }),
                error &&
                  (0, jsx_runtime.jsx)('div', {
                    id: errorId,
                    className: 'fds-native-select__error-message',
                    'aria-live': 'polite',
                    'aria-relevant': 'additions removals',
                    children: (0, jsx_runtime.jsx)(ErrorMessage.K, { size, children: error }),
                  }),
              ],
            }),
          });
        });
        NativeSelect.displayName = 'NativeSelect';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/useFormField.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { W: () => useFormField });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        _Fieldset_FieldsetContext_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/FieldsetContext.js',
        );
      const useFormField = (props, prefix) => {
        const fieldset = (0, react__WEBPACK_IMPORTED_MODULE_0__.useContext)(
            _Fieldset_FieldsetContext_js__WEBPACK_IMPORTED_MODULE_1__.S,
          ),
          randomId = (0, react__WEBPACK_IMPORTED_MODULE_0__.useId)(),
          id = props.id ?? `${prefix}-${randomId}`,
          errorId = props.errorId ?? `${prefix}-error-${randomId}`,
          descriptionId = `${prefix}-description-${randomId}`,
          disabled = fieldset?.disabled || props?.disabled,
          readOnly = ((fieldset?.readOnly || props?.readOnly) && !disabled) || void 0,
          hasError = !(disabled || readOnly || (!props.error && !fieldset?.error));
        return {
          readOnly,
          hasError,
          errorId,
          descriptionId,
          size: (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(
            props.size || fieldset?.size || 'md',
          ),
          inputProps: {
            id,
            disabled,
            'aria-invalid': !!hasError || void 0,
            'aria-describedby':
              (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_3__.$)(
                props['aria-describedby'],
                !!props?.description && 'string' == typeof props?.description && descriptionId,
                hasError && !fieldset?.error && errorId,
                hasError && !!fieldset?.error && fieldset?.errorId,
              ) || void 0,
          },
        };
      };
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/objectUtils.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { c: () => omit });
      const omit = (names, obj) => {
        const result = {},
          index = {};
        let idx = 0;
        const len = names.length;
        for (; idx < len; ) (index[names[idx]] = 1), (idx += 1);
        for (const prop in obj)
          Object.prototype.hasOwnProperty.call(index, prop) || (result[prop] = obj[prop]);
        return result;
      };
    },
    '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _util_useId__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/util/useId.js',
          ),
          __rest = function (s, e) {
            var t = {};
            for (var p in s)
              Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0 && (t[p] = s[p]);
            if (null != s && 'function' == typeof Object.getOwnPropertySymbols) {
              var i = 0;
              for (p = Object.getOwnPropertySymbols(s); i < p.length; i++)
                e.indexOf(p[i]) < 0 &&
                  Object.prototype.propertyIsEnumerable.call(s, p[i]) &&
                  (t[p[i]] = s[p[i]]);
            }
            return t;
          };
        const __WEBPACK_DEFAULT_EXPORT__ = (0, react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
          (_a, ref) => {
            var { title, titleId: _titleId } = _a,
              props = __rest(_a, ['title', 'titleId']);
            let titleId = (0, _util_useId__WEBPACK_IMPORTED_MODULE_1__.B)();
            return (
              (titleId = title ? _titleId || 'title-' + titleId : void 0),
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                'svg',
                Object.assign(
                  {
                    width: '1em',
                    height: '1em',
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    xmlns: 'http://www.w3.org/2000/svg',
                    focusable: !1,
                    role: 'img',
                    ref,
                    'aria-labelledby': titleId,
                  },
                  props,
                ),
                title
                  ? react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      'title',
                      { id: titleId },
                      title,
                    )
                  : null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement('path', {
                  fillRule: 'evenodd',
                  clipRule: 'evenodd',
                  d: 'M12 2.25A4.75 4.75 0 0 0 7.25 7v2.25H7A1.75 1.75 0 0 0 5.25 11v9c0 .414.336.75.75.75h12a.75.75 0 0 0 .75-.75v-9A1.75 1.75 0 0 0 17 9.25h-.25V7A4.75 4.75 0 0 0 12 2.25Zm3.25 7V7a3.25 3.25 0 0 0-6.5 0v2.25h6.5ZM12 13a1.5 1.5 0 0 0-.75 2.8V17a.75.75 0 0 0 1.5 0v-1.2A1.5 1.5 0 0 0 12 13Z',
                  fill: 'currentColor',
                }),
              )
            );
          },
        );
      },
    '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/util/useId.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { B: () => useId });
        var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        );
        let globalId = 0;
        const maybeReactUseId = react__WEBPACK_IMPORTED_MODULE_0__.useId;
        function useId(idOverride) {
          var _a;
          if (void 0 !== maybeReactUseId) {
            const reactId = maybeReactUseId();
            return null != idOverride ? idOverride : reactId.replace(/(:)/g, '');
          }
          return null !==
            (_a = (function useGlobalId(idOverride) {
              const [defaultId, setDefaultId] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
                  idOverride,
                ),
                id = idOverride || defaultId;
              return (
                (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
                  null == defaultId && ((globalId += 1), setDefaultId(`aksel-icon-${globalId}`));
                }, [defaultId]),
                id
              );
            })(idOverride)) && void 0 !== _a
            ? _a
            : '';
        }
      },
    './src/components/StudioNativeSelect/StudioNativeSelect.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { e: () => StudioNativeSelect });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/NativeSelect/NativeSelect.js',
        );
      const StudioNativeSelect = (0, react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
        ({ children, description, label, id, size, ...rest }, ref) => {
          const defaultId = (0, react__WEBPACK_IMPORTED_MODULE_0__.useId)();
          return (
            (id = id ?? defaultId),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.m,
              { description, label, ref, size, id, ...rest },
              children,
            )
          );
        },
      );
      (StudioNativeSelect.displayName = 'StudioNativeSelect'),
        (StudioNativeSelect.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioNativeSelect',
        });
    },
    './src/components/StudioNativeSelect/StudioNativeSelect.stories.tsx': (
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
        _StudioNativeSelect__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioNativeSelect/StudioNativeSelect.tsx',
        );
      const meta = {
          title: 'StudioNativeSelect',
          component: _StudioNativeSelect__WEBPACK_IMPORTED_MODULE_1__.e,
          argTypes: { size: { control: 'radio', options: ['xsmall', 'small', 'medium', 'large'] } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioNativeSelect__WEBPACK_IMPORTED_MODULE_1__.e,
            args,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement('option', { value: '1' }, 'Option 1'),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement('option', { value: '2' }, 'Option 2'),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement('option', { value: '3' }, 'Option 3'),
          );
      Preview.args = { label: 'Label', description: 'This is a description', size: 'medium' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              "(args): React.ReactElement => <StudioNativeSelect {...args}>\n    <option value='1'>Option 1</option>\n    <option value='2'>Option 2</option>\n    <option value='3'>Option 3</option>\n  </StudioNativeSelect>",
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
