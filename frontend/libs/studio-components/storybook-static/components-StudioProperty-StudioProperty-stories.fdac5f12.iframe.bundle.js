/*! For license information please see components-StudioProperty-StudioProperty-stories.fdac5f12.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [7291],
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
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
        'use strict';
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/Fieldset.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { L: () => Fieldset });
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
          );
        var FieldsetContext = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/FieldsetContext.js',
          ),
          Label = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
          ),
          Paragraph = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
          ),
          ErrorMessage = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
          );
        const Fieldset = (0, react.forwardRef)((props, ref) => {
          const { children, legend, description, error, hideLegend, className, ...rest } = props,
            { fieldsetProps, size, readOnly, errorId, hasError, descriptionId } = ((props) => {
              const formField = (0, useFormField.W)(props, 'fieldset'),
                { inputProps } = formField;
              return {
                ...formField,
                fieldsetProps: {
                  'aria-invalid': inputProps['aria-invalid'],
                  'aria-describedby': inputProps['aria-describedby'],
                },
              };
            })(props),
            fieldset = (0, react.useContext)(FieldsetContext.S);
          return (0, jsx_runtime.jsx)(FieldsetContext.S.Provider, {
            value: {
              error: error ?? fieldset?.error,
              errorId: hasError ? errorId : void 0,
              size,
              disabled: props?.disabled,
              readOnly,
            },
            children: (0, jsx_runtime.jsxs)('fieldset', {
              ...fieldsetProps,
              className: (0, lite.$)(
                'fds-fieldset',
                !hideLegend && 'fds-fieldset--spacing',
                readOnly && 'fds-fieldset--readonly',
                className,
              ),
              disabled: props?.disabled,
              ref,
              ...rest,
              children: [
                (0, jsx_runtime.jsx)(Label.J, {
                  asChild: !0,
                  size,
                  children: (0, jsx_runtime.jsx)('legend', {
                    className: 'fds-fieldset__legend',
                    children: (0, jsx_runtime.jsxs)('span', {
                      className: (0, lite.$)(
                        'fds-fieldset__legend__content',
                        hideLegend && 'fds-sr-only',
                      ),
                      children: [
                        readOnly &&
                          (0, jsx_runtime.jsx)(PadlockLockedFill.A, {
                            className: 'fds-fieldset__readonly__icon',
                            'aria-hidden': !0,
                          }),
                        legend,
                      ],
                    }),
                  }),
                }),
                description &&
                  (0, jsx_runtime.jsx)(Paragraph.f, {
                    size,
                    variant: 'short',
                    asChild: !0,
                    children: (0, jsx_runtime.jsx)('div', {
                      id: descriptionId,
                      className: (0, lite.$)(
                        'fds-fieldset__description',
                        hideLegend && 'fds-sr-only',
                      ),
                      children: description,
                    }),
                  }),
                children,
                (0, jsx_runtime.jsx)('div', {
                  id: errorId,
                  'aria-live': 'polite',
                  'aria-relevant': 'additions removals',
                  className: 'fds-fieldset__error-message',
                  children:
                    hasError && (0, jsx_runtime.jsx)(ErrorMessage.K, { size, children: error }),
                }),
              ],
            }),
          });
        });
        Fieldset.displayName = 'Fieldset';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/FieldsetContext.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { S: () => FieldsetContext });
        const FieldsetContext = (0,
        __webpack_require__('../../../node_modules/react/index.js').createContext)(null);
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/useFormField.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
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
    '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
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
        'use strict';
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
    './src/components/StudioProperty/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { C: () => StudioProperty });
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
        StudioPropertyGroup_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyGroup/StudioPropertyGroup.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioPropertyGroup_module.A, options);
      const StudioPropertyGroup_StudioPropertyGroup_module =
          StudioPropertyGroup_module.A && StudioPropertyGroup_module.A.locals
            ? StudioPropertyGroup_module.A.locals
            : void 0,
        StudioPropertyGroup = (0, react.forwardRef)(
          ({ className: givenClass, children, ...rest }, ref) => {
            const className = classnames_default()(
              givenClass,
              StudioPropertyGroup_StudioPropertyGroup_module.listWrapper,
            );
            return react.createElement('div', { className, ref, ...rest }, children);
          },
        );
      (StudioPropertyGroup.displayName = 'StudioProperty.Group'),
        (StudioPropertyGroup.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioProperty.Group',
        });
      var StudioButton = __webpack_require__('./src/components/StudioButton/index.ts'),
        StudioPropertyButton_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyButton/StudioPropertyButton.module.css',
        ),
        StudioPropertyButton_module_options = {};
      (StudioPropertyButton_module_options.styleTagTransform = styleTagTransform_default()),
        (StudioPropertyButton_module_options.setAttributes =
          setAttributesWithoutAttributes_default()),
        (StudioPropertyButton_module_options.insert = insertBySelector_default().bind(
          null,
          'head',
        )),
        (StudioPropertyButton_module_options.domAPI = styleDomAPI_default()),
        (StudioPropertyButton_module_options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(
        StudioPropertyButton_module.A,
        StudioPropertyButton_module_options,
      );
      const StudioPropertyButton_StudioPropertyButton_module =
        StudioPropertyButton_module.A && StudioPropertyButton_module.A.locals
          ? StudioPropertyButton_module.A.locals
          : void 0;
      var src = __webpack_require__('../studio-icons/src/index.ts');
      const StudioPropertyButton = (0, react.forwardRef)(
        (
          {
            className: givenClass,
            compact,
            readOnly,
            icon: givenIcon,
            property,
            value,
            withoutNegativeMargin,
            ...rest
          },
          ref,
        ) => {
          const hasValue = !!value,
            icon =
              hasValue || givenIcon ? givenIcon : react.createElement(src.PlusCircleIcon, null),
            className = classnames_default()(
              StudioPropertyButton_StudioPropertyButton_module.propertyButton,
              hasValue && StudioPropertyButton_StudioPropertyButton_module.withValue,
              compact && StudioPropertyButton_StudioPropertyButton_module.compact,
              readOnly && StudioPropertyButton_StudioPropertyButton_module.readOnly,
              withoutNegativeMargin &&
                StudioPropertyButton_StudioPropertyButton_module.withoutNegativeMargin,
              givenClass,
            );
          return (
            readOnly && (rest.onClick = null),
            react.createElement(
              StudioButton.r,
              {
                'aria-label': property,
                'aria-readonly': !!readOnly || null,
                className,
                fullWidth: !0,
                icon,
                ref,
                title: property,
                variant: 'tertiary',
                ...rest,
              },
              react.createElement(
                'span',
                { className: StudioPropertyButton_StudioPropertyButton_module.content },
                react.createElement(
                  'span',
                  { className: StudioPropertyButton_StudioPropertyButton_module.property },
                  property,
                ),
                react.createElement(
                  'span',
                  { className: StudioPropertyButton_StudioPropertyButton_module.value },
                  value,
                ),
              ),
              readOnly
                ? react.createElement(
                    'span',
                    { className: StudioPropertyButton_StudioPropertyButton_module.readOnlyWrapper },
                    react.createElement(src.PadlockLockedFillIcon, null),
                  )
                : hasValue &&
                    react.createElement(
                      'span',
                      {
                        className: StudioPropertyButton_StudioPropertyButton_module.editIconWrapper,
                      },
                      react.createElement(src.PencilIcon, null),
                    ),
            )
          );
        },
      );
      (StudioPropertyButton.displayName = 'StudioProperty.Button'),
        (StudioPropertyButton.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioProperty.Button',
        });
      var Fieldset = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/Fieldset.js',
        ),
        StudioPropertyFieldset_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyFieldset/StudioPropertyFieldset.module.css',
        ),
        StudioPropertyFieldset_module_options = {};
      (StudioPropertyFieldset_module_options.styleTagTransform = styleTagTransform_default()),
        (StudioPropertyFieldset_module_options.setAttributes =
          setAttributesWithoutAttributes_default()),
        (StudioPropertyFieldset_module_options.insert = insertBySelector_default().bind(
          null,
          'head',
        )),
        (StudioPropertyFieldset_module_options.domAPI = styleDomAPI_default()),
        (StudioPropertyFieldset_module_options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(
        StudioPropertyFieldset_module.A,
        StudioPropertyFieldset_module_options,
      );
      const StudioPropertyFieldset_StudioPropertyFieldset_module =
          StudioPropertyFieldset_module.A && StudioPropertyFieldset_module.A.locals
            ? StudioPropertyFieldset_module.A.locals
            : void 0,
        StudioPropertyFieldset = (0, react.forwardRef)(
          ({ menubar, children, className: givenClass, compact, ...props }, ref) => {
            const className = classnames_default()(
              givenClass,
              StudioPropertyFieldset_StudioPropertyFieldset_module.propertyFieldset,
              compact && StudioPropertyFieldset_StudioPropertyFieldset_module.compact,
            );
            return react.createElement(
              Fieldset.L,
              { size: 'small', ...props, className, ref },
              react.createElement(
                'div',
                {
                  className: StudioPropertyFieldset_StudioPropertyFieldset_module.menubar,
                  role: 'menubar',
                },
                menubar,
              ),
              react.createElement(
                'div',
                { className: StudioPropertyFieldset_StudioPropertyFieldset_module.content },
                children,
              ),
            );
          },
        );
      (StudioPropertyFieldset.displayName = 'StudioProperty.Fieldset'),
        (StudioPropertyFieldset.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioProperty.Fieldset',
        });
      const StudioProperty = {
        Group: StudioPropertyGroup,
        Button: StudioPropertyButton,
        Fieldset: StudioPropertyFieldset,
      };
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
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyButton/StudioPropertyButton.module.css':
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
          '.IFfN289R1o5_uqtwJu49 {\n  border-radius: 0;\n  display: flex;\n  justify-content: flex-start;\n  margin: calc(-1 * var(--studio-property-button-vertical-spacing)) 0;\n  overflow: hidden;\n  padding: var(--studio-property-button-vertical-spacing) var(--fds-spacing-5);\n}\n\n.IFfN289R1o5_uqtwJu49.hvWqO4umQOnpulCVnC5h .Io8fxWQcIOTixYUlzUFN {\n  color: var(--fds-semantic-text-neutral-default);\n  text-align: left;\n}\n\n.IFfN289R1o5_uqtwJu49.hvWqO4umQOnpulCVnC5h .bSDWWcS_W3UjIBUBhFET {\n  font-weight: 500;\n}\n\n.Io8fxWQcIOTixYUlzUFN {\n  overflow: hidden;\n  white-space: nowrap;\n}\n\n.POrn8HpDpnhtq6OjZ0mH:hover {\n  cursor: auto !important;\n  background-color: transparent !important;\n}\n\n.bSDWWcS_W3UjIBUBhFET,\n.Vv0LXLdJgqaCnRfVXxFN {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n._jA_OyiZswqSdIrilNw8,\n.dnMVkg9lCzJeIBe5WzTR {\n  flex: 1;\n  text-align: right;\n  display: none;\n}\n\n._jA_OyiZswqSdIrilNw8,\n.IFfN289R1o5_uqtwJu49:hover .dnMVkg9lCzJeIBe5WzTR,\n.IFfN289R1o5_uqtwJu49:focus .dnMVkg9lCzJeIBe5WzTR {\n  display: inline-block;\n}\n\n._jA_OyiZswqSdIrilNw8 {\n  color: black;\n}\n\n.IFfN289R1o5_uqtwJu49.ol7jOdmGy3ys4akR1aAz {\n  padding-left: var(--fds-spacing-3);\n  padding-right: var(--fds-spacing-3);\n}\n\n.IFfN289R1o5_uqtwJu49.F9zxpECXZOdnZpDdFQbK {\n  margin: 0;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioProperty/StudioPropertyButton/StudioPropertyButton.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,gBAAgB;EAChB,aAAa;EACb,2BAA2B;EAC3B,mEAAmE;EACnE,gBAAgB;EAChB,4EAA4E;AAC9E;;AAEA;EACE,+CAA+C;EAC/C,gBAAgB;AAClB;;AAEA;EACE,gBAAgB;AAClB;;AAEA;EACE,gBAAgB;EAChB,mBAAmB;AACrB;;AAEA;EACE,uBAAuB;EACvB,wCAAwC;AAC1C;;AAEA;;EAEE,cAAc;EACd,gBAAgB;EAChB,uBAAuB;AACzB;;AAEA;;EAEE,OAAO;EACP,iBAAiB;EACjB,aAAa;AACf;;AAEA;;;EAGE,qBAAqB;AACvB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,kCAAkC;EAClC,mCAAmC;AACrC;;AAEA;EACE,SAAS;AACX',
            sourcesContent: [
              '.propertyButton {\n  border-radius: 0;\n  display: flex;\n  justify-content: flex-start;\n  margin: calc(-1 * var(--studio-property-button-vertical-spacing)) 0;\n  overflow: hidden;\n  padding: var(--studio-property-button-vertical-spacing) var(--fds-spacing-5);\n}\n\n.propertyButton.withValue .content {\n  color: var(--fds-semantic-text-neutral-default);\n  text-align: left;\n}\n\n.propertyButton.withValue .property {\n  font-weight: 500;\n}\n\n.content {\n  overflow: hidden;\n  white-space: nowrap;\n}\n\n.readOnly:hover {\n  cursor: auto !important;\n  background-color: transparent !important;\n}\n\n.property,\n.value {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.readOnlyWrapper,\n.editIconWrapper {\n  flex: 1;\n  text-align: right;\n  display: none;\n}\n\n.readOnlyWrapper,\n.propertyButton:hover .editIconWrapper,\n.propertyButton:focus .editIconWrapper {\n  display: inline-block;\n}\n\n.readOnlyWrapper {\n  color: black;\n}\n\n.propertyButton.compact {\n  padding-left: var(--fds-spacing-3);\n  padding-right: var(--fds-spacing-3);\n}\n\n.propertyButton.withoutNegativeMargin {\n  margin: 0;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            propertyButton: 'IFfN289R1o5_uqtwJu49',
            withValue: 'hvWqO4umQOnpulCVnC5h',
            content: 'Io8fxWQcIOTixYUlzUFN',
            property: 'bSDWWcS_W3UjIBUBhFET',
            readOnly: 'POrn8HpDpnhtq6OjZ0mH',
            value: 'Vv0LXLdJgqaCnRfVXxFN',
            readOnlyWrapper: '_jA_OyiZswqSdIrilNw8',
            editIconWrapper: 'dnMVkg9lCzJeIBe5WzTR',
            compact: 'ol7jOdmGy3ys4akR1aAz',
            withoutNegativeMargin: 'F9zxpECXZOdnZpDdFQbK',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyFieldset/StudioPropertyFieldset.module.css':
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
          '.wRBrT_YFuFXY1kIrK94K {\n  align-items: center;\n  background-color: var(--fds-semantic-surface-action-first-no_fill);\n  border-radius: var(--fds-border_radius-medium);\n  box-shadow: var(--fds-shadow-small);\n  box-sizing: border-box;\n  display: grid;\n  gap: var(--studio-property-fieldset-spacing);\n  grid-template-columns: [start] 1fr auto [end];\n  margin: 0 var(--fds-spacing-5);\n  overflow: auto;\n  padding: 0;\n  border: 1px solid var(--fds-semantic-border-first-default);\n}\n\n.wRBrT_YFuFXY1kIrK94K legend > * {\n  margin-left: var(--studio-property-fieldset-spacing);\n  margin-top: var(--studio-property-fieldset-spacing);\n  font-weight: 600;\n}\n\n.XDz5Gtp8dB9RT26YFnJQ {\n  align-items: center;\n  display: flex;\n  gap: var(--studio-property-fieldset-spacing);\n  margin-right: var(--studio-property-fieldset-spacing);\n  margin-top: var(--studio-property-fieldset-spacing);\n}\n\n.YeoUnJQCWVH2moWJbVzk {\n  grid-column-end: end;\n  grid-column-start: start;\n}\n\n.wRBrT_YFuFXY1kIrK94K.fFqjDZ4B6ZB0hVBjVYco {\n  --studio-property-fieldset-spacing: var(--fds-spacing-2);\n  margin: 0 var(--fds-spacing-3);\n  box-shadow: none;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioProperty/StudioPropertyFieldset/StudioPropertyFieldset.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,mBAAmB;EACnB,kEAAkE;EAClE,8CAA8C;EAC9C,mCAAmC;EACnC,sBAAsB;EACtB,aAAa;EACb,4CAA4C;EAC5C,6CAA6C;EAC7C,8BAA8B;EAC9B,cAAc;EACd,UAAU;EACV,0DAA0D;AAC5D;;AAEA;EACE,oDAAoD;EACpD,mDAAmD;EACnD,gBAAgB;AAClB;;AAEA;EACE,mBAAmB;EACnB,aAAa;EACb,4CAA4C;EAC5C,qDAAqD;EACrD,mDAAmD;AACrD;;AAEA;EACE,oBAAoB;EACpB,wBAAwB;AAC1B;;AAEA;EACE,wDAAwD;EACxD,8BAA8B;EAC9B,gBAAgB;AAClB',
            sourcesContent: [
              '.propertyFieldset {\n  align-items: center;\n  background-color: var(--fds-semantic-surface-action-first-no_fill);\n  border-radius: var(--fds-border_radius-medium);\n  box-shadow: var(--fds-shadow-small);\n  box-sizing: border-box;\n  display: grid;\n  gap: var(--studio-property-fieldset-spacing);\n  grid-template-columns: [start] 1fr auto [end];\n  margin: 0 var(--fds-spacing-5);\n  overflow: auto;\n  padding: 0;\n  border: 1px solid var(--fds-semantic-border-first-default);\n}\n\n.propertyFieldset legend > * {\n  margin-left: var(--studio-property-fieldset-spacing);\n  margin-top: var(--studio-property-fieldset-spacing);\n  font-weight: 600;\n}\n\n.menubar {\n  align-items: center;\n  display: flex;\n  gap: var(--studio-property-fieldset-spacing);\n  margin-right: var(--studio-property-fieldset-spacing);\n  margin-top: var(--studio-property-fieldset-spacing);\n}\n\n.content {\n  grid-column-end: end;\n  grid-column-start: start;\n}\n\n.propertyFieldset.compact {\n  --studio-property-fieldset-spacing: var(--fds-spacing-2);\n  margin: 0 var(--fds-spacing-3);\n  box-shadow: none;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            propertyFieldset: 'wRBrT_YFuFXY1kIrK94K',
            menubar: 'XDz5Gtp8dB9RT26YFnJQ',
            content: 'YeoUnJQCWVH2moWJbVzk',
            compact: 'fFqjDZ4B6ZB0hVBjVYco',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioProperty/StudioPropertyGroup/StudioPropertyGroup.module.css':
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
          '.ZidRNaK94ESIlkUtbQnu {\n  display: flex;\n  flex-direction: column;\n  gap: var(--studio-property-vertical-gap);\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioProperty/StudioPropertyGroup/StudioPropertyGroup.module.css',
            ],
            names: [],
            mappings: 'AAAA;EACE,aAAa;EACb,sBAAsB;EACtB,wCAAwC;AAC1C',
            sourcesContent: [
              '.listWrapper {\n  display: flex;\n  flex-direction: column;\n  gap: var(--studio-property-vertical-gap);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { listWrapper: 'ZidRNaK94ESIlkUtbQnu' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioProperty/StudioProperty.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Button: () => Button,
          Fieldset: () => Fieldset,
          Group: () => Group,
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioProperty/index.ts',
        );
      const ComposedPreviewComponent = ({ withoutNegativeMargin, legend, buttons }) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _index__WEBPACK_IMPORTED_MODULE_1__.C.Group,
            { withoutNegativeMargin },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _index__WEBPACK_IMPORTED_MODULE_1__.C.Fieldset,
              { legend },
              buttons.map((button) =>
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  _index__WEBPACK_IMPORTED_MODULE_1__.C.Button,
                  { key: button.property, ...button },
                ),
              ),
            ),
          ),
        meta = { title: 'StudioProperty', component: ComposedPreviewComponent },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(ComposedPreviewComponent, args);
      Preview.args = {
        buttons: [
          { property: 'Home', value: 'Sweet Home 41, 0000 No Where' },
          { property: 'Cabin', value: 'Mountain Street, 99999 Snow Place' },
          { property: 'Work', value: 'Workstation 1, 12345 Office Town' },
        ],
        withoutNegativeMargin: !1,
        legend: 'My addresses',
      };
      const Group = (args) =>
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _index__WEBPACK_IMPORTED_MODULE_1__.C.Group,
          { withoutNegativeMargin: args.withoutNegativeMargin },
          args.children,
        );
      Group.args = {
        withoutNegativeMargin: !1,
        children: "StudioPropertyGroup's children should be StudioProperty.Fieldset component",
      };
      const Fieldset = (args) =>
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _index__WEBPACK_IMPORTED_MODULE_1__.C.Fieldset,
          args,
          args.children,
        );
      Fieldset.args = {
        legend: 'My addresses',
        children: 'StudioProperty.Fieldset children should be StudioProperty.Button components',
      };
      const Button = (args) =>
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _index__WEBPACK_IMPORTED_MODULE_1__.C.Button,
          args,
        );
      Button.args = { property: 'Home', value: 'Sweet Home 41, 0000 No Where' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview', 'Group', 'Fieldset', 'Button'];
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
        (Group.parameters = {
          ...Group.parameters,
          docs: {
            ...Group.parameters?.docs,
            source: {
              originalSource:
                '(args): React.ReactElement => <StudioProperty.Group withoutNegativeMargin={args.withoutNegativeMargin}>\n    {args.children}\n  </StudioProperty.Group>',
              ...Group.parameters?.docs?.source,
            },
          },
        }),
        (Fieldset.parameters = {
          ...Fieldset.parameters,
          docs: {
            ...Fieldset.parameters?.docs,
            source: {
              originalSource:
                '(args): React.ReactElement => <StudioProperty.Fieldset {...args}>{args.children}</StudioProperty.Fieldset>',
              ...Fieldset.parameters?.docs?.source,
            },
          },
        }),
        (Button.parameters = {
          ...Button.parameters,
          docs: {
            ...Button.parameters?.docs,
            source: {
              originalSource: '(args): React.ReactElement => <StudioProperty.Button {...args} />',
              ...Button.parameters?.docs?.source,
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
