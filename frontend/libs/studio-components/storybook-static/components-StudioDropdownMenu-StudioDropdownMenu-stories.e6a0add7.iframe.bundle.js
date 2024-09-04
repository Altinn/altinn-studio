/*! For license information please see components-StudioDropdownMenu-StudioDropdownMenu-stories.e6a0add7.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [7101],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenu.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, {
          c: () => DropdownMenuContext,
          r: () => DropdownMenu,
        });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
          );
        const DropdownMenu = ({
            open,
            onClose,
            placement = 'bottom-end',
            portal,
            children,
            ...rest
          }) => {
            const size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(
                rest.size || 'md',
              ),
              triggerRef = (0, react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null),
              [internalOpen, setInternalOpen] = (0, react__WEBPACK_IMPORTED_MODULE_1__.useState)(
                open ?? !1,
              ),
              anchorEl = triggerRef.current,
              isControlled = 'boolean' == typeof open;
            return (
              (0, react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
                setInternalOpen(open ?? !1);
              }, [open]),
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
                DropdownMenuContext.Provider,
                {
                  value: {
                    anchorEl,
                    triggerRef,
                    size,
                    portal,
                    placement,
                    internalOpen,
                    isControlled,
                    onClose,
                    setInternalOpen,
                  },
                  children,
                },
              )
            );
          },
          DropdownMenuContext = (0, react__WEBPACK_IMPORTED_MODULE_1__.createContext)({
            triggerRef: { current: null },
            size: 'md',
            anchorEl: null,
            internalOpen: !1,
            setInternalOpen: () => {},
          });
        DropdownMenu.displayName = 'DropdownMenu';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenuGroup.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { I: () => DropdownMenuGroup });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _DropdownMenu_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenu.js',
          ),
          _Typography_Paragraph_Paragraph_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
          );
        const DropdownMenuGroup = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ children, heading, className, style, ...rest }, ref) => {
            const { size } = (0, react__WEBPACK_IMPORTED_MODULE_1__.useContext)(
                _DropdownMenu_js__WEBPACK_IMPORTED_MODULE_2__.c,
              ),
              headingId = (0, react__WEBPACK_IMPORTED_MODULE_1__.useId)();
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)('li', {
              className,
              style,
              children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)('ul', {
                ...(heading ? { 'aria-labelledby': headingId } : {}),
                ref,
                role: 'group',
                className: 'fds-dropdownmenu__section',
                ...rest,
                children: [
                  heading &&
                    (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
                      _Typography_Paragraph_Paragraph_js__WEBPACK_IMPORTED_MODULE_3__.f,
                      {
                        asChild: !0,
                        size,
                        children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)('h2', {
                          id: headingId,
                          className: 'fds-dropdownmenu__heading',
                          children: heading,
                        }),
                      },
                    ),
                  children,
                ],
              }),
            });
          },
        );
        DropdownMenuGroup.displayName = 'DropdownMenuGroup';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/index.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { rI: () => DropdownMenu_DropdownMenu });
        var DropdownMenu = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenu.js',
          ),
          DropdownMenuGroup = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenuGroup.js',
          ),
          jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          Button = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
          );
        const DropdownMenuItem = (0, react.forwardRef)(
          ({ children, className, style, ...rest }, ref) => {
            const { size } = (0, react.useContext)(DropdownMenu.c);
            return (0, jsx_runtime.jsx)('li', {
              className,
              style,
              children: (0, jsx_runtime.jsx)(Button.$, {
                ref,
                variant: 'tertiary',
                size,
                fullWidth: !0,
                className: 'fds-dropdownmenu__item',
                role: 'menuitem',
                ...rest,
                children,
              }),
            });
          },
        );
        DropdownMenuItem.displayName = 'DropdownMenuItem';
        var floating_ui_react = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js',
          ),
          dist = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          );
        const DropdownMenuTrigger = (0, react.forwardRef)(({ asChild, ...rest }, ref) => {
          const { triggerRef, internalOpen, setInternalOpen, isControlled } = (0, react.useContext)(
              DropdownMenu.c,
            ),
            mergedRefs = (0, floating_ui_react.SV)([ref, triggerRef]),
            Component = asChild ? dist.D : Button.$;
          return (0, jsx_runtime.jsx)(Component, {
            ref: mergedRefs,
            onClick: () => {
              isControlled || setInternalOpen(!internalOpen);
            },
            'aria-haspopup': 'menu',
            'aria-expanded': internalOpen,
            ...rest,
          });
        });
        DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';
        var lite = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          floating_ui_dom = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/dom/dist/floating-ui.dom.js',
          ),
          floating_ui_core = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/core/dist/floating-ui.core.js',
          ),
          useIsomorphicLayoutEffect = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/hooks/useIsomorphicLayoutEffect.js',
          );
        const DropdownMenuContent = (0, react.forwardRef)(
          ({ className, children, ...rest }, ref) => {
            const {
                size,
                placement,
                portal,
                anchorEl,
                isControlled,
                internalOpen,
                setInternalOpen,
                onClose,
              } = (0, react.useContext)(DropdownMenu.c),
              Container = portal ? floating_ui_react.XF : react.Fragment,
              floatingEl = (0, react.useRef)(null),
              {
                context,
                update,
                refs,
                placement: flPlacement,
                floatingStyles,
              } = (0, floating_ui_react.we)({
                placement,
                open: internalOpen,
                onOpenChange: (localOpen) => {
                  localOpen || (onClose && onClose()), isControlled || setInternalOpen(localOpen);
                },
                elements: { reference: anchorEl, floating: floatingEl.current },
                whileElementsMounted: floating_ui_dom.ll,
                middleware: [(0, floating_ui_core.cY)(4), (0, floating_ui_dom.BN)()],
              }),
              { getFloatingProps } = (0, floating_ui_react.bv)([
                (0, floating_ui_react.iQ)(context),
                (0, floating_ui_react.kp)(context),
                (0, floating_ui_react.s9)(context),
                (0, floating_ui_react.It)(context),
              ]);
            (0, useIsomorphicLayoutEffect.E)(() => {
              if (
                (refs.setReference(anchorEl),
                !refs.reference.current || !refs.floating.current || !internalOpen)
              )
                return;
              const cleanup = (0, floating_ui_dom.ll)(
                refs.reference.current,
                refs.floating.current,
                update,
              );
              return () => cleanup();
            }, [refs.floating, refs.reference, update, anchorEl, refs, internalOpen]);
            const floatingRef = (0, floating_ui_react.SV)([refs.setFloating, ref]);
            return (0, jsx_runtime.jsx)(jsx_runtime.Fragment, {
              children:
                internalOpen &&
                (0, jsx_runtime.jsx)(floating_ui_react.s3, {
                  context,
                  guards: !1,
                  modal: !1,
                  children: (0, jsx_runtime.jsx)(Container, {
                    children: (0, jsx_runtime.jsx)('ul', {
                      role: 'menu',
                      'aria-hidden': !internalOpen,
                      'data-placement': flPlacement,
                      ref: floatingRef,
                      style: floatingStyles,
                      ...getFloatingProps({ ref: floatingRef, tabIndex: void 0 }),
                      className: (0, lite.$)(
                        'fds-dropdownmenu',
                        `fds-dropdownmenu--${size}`,
                        className,
                      ),
                      ...rest,
                      children,
                    }),
                  }),
                }),
            });
          },
        );
        DropdownMenuContent.displayName = 'DropdownMenuContent';
        const DropdownMenu_DropdownMenu = DropdownMenu.r;
        (DropdownMenu_DropdownMenu.Content = DropdownMenuContent),
          (DropdownMenu_DropdownMenu.Group = DropdownMenuGroup.I),
          (DropdownMenu_DropdownMenu.Item = DropdownMenuItem),
          (DropdownMenu_DropdownMenu.Trigger = DropdownMenuTrigger),
          (DropdownMenu_DropdownMenu.Content.displayName = 'DropdownMenu.Content'),
          (DropdownMenu_DropdownMenu.Group.displayName = 'DropdownMenu.Group'),
          (DropdownMenu_DropdownMenu.Item.displayName = 'DropdownMenu.Item'),
          (DropdownMenu_DropdownMenu.Trigger.displayName = 'DropdownMenu.Trigger');
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/hooks/useIsomorphicLayoutEffect.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
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
    './src/components/StudioDropdownMenu/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, {
        X: () => StudioDropdownMenu_StudioDropdownMenu,
      });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        DropdownMenu = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/index.js',
        ),
        StudioButton = __webpack_require__('./src/components/StudioButton/index.ts');
      const StudioDropdownMenuContext = (0, react.createContext)(null),
        StudioDropdownMenu = ({ anchorButtonProps, children, ...rest }) => {
          const [open, setOpen] = (0, react.useState)(!1);
          return react.createElement(
            DropdownMenu.rI,
            { portal: !0, ...rest, onClose: () => setOpen(!1), open },
            react.createElement(
              DropdownMenu.rI.Trigger,
              { asChild: !0 },
              react.createElement(StudioButton.r, {
                'aria-expanded': open,
                'aria-haspopup': 'menu',
                size: rest.size,
                onClick: () => setOpen(!open),
                ...anchorButtonProps,
              }),
            ),
            react.createElement(
              DropdownMenu.rI.Content,
              null,
              react.createElement(
                StudioDropdownMenuContext.Provider,
                { value: { setOpen } },
                children,
              ),
            ),
          );
        };
      StudioDropdownMenu.__docgenInfo = {
        description: '',
        methods: [],
        displayName: 'StudioDropdownMenu',
        props: {
          anchorButtonProps: {
            required: !1,
            tsType: {
              name: 'intersection',
              raw: "Omit<ButtonProps, 'icon' | 'color'> & {\n  icon?: ReactNode;\n  iconPlacement?: IconPlacement;\n  color?: ButtonProps['color'] | 'inverted';\n}",
              elements: [
                {
                  name: 'Omit',
                  elements: [
                    { name: 'ButtonProps' },
                    {
                      name: 'union',
                      raw: "'icon' | 'color'",
                      elements: [
                        { name: 'literal', value: "'icon'" },
                        { name: 'literal', value: "'color'" },
                      ],
                    },
                  ],
                  raw: "Omit<ButtonProps, 'icon' | 'color'>",
                },
                {
                  name: 'signature',
                  type: 'object',
                  raw: "{\n  icon?: ReactNode;\n  iconPlacement?: IconPlacement;\n  color?: ButtonProps['color'] | 'inverted';\n}",
                  signature: {
                    properties: [
                      { key: 'icon', value: { name: 'ReactNode', required: !1 } },
                      {
                        key: 'iconPlacement',
                        value: {
                          name: 'union',
                          raw: "'left' | 'right'",
                          elements: [
                            { name: 'literal', value: "'left'" },
                            { name: 'literal', value: "'right'" },
                          ],
                          required: !1,
                        },
                      },
                      {
                        key: 'color',
                        value: {
                          name: 'union',
                          raw: "ButtonProps['color'] | 'inverted'",
                          elements: [
                            { name: "ButtonProps['color']", raw: "ButtonProps['color']" },
                            { name: 'literal', value: "'inverted'" },
                          ],
                          required: !1,
                        },
                      },
                    ],
                  },
                },
              ],
            },
            description: '',
          },
        },
        composes: ['Omit'],
      };
      var DropdownMenuGroup = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenuGroup.js',
        ),
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
        StudioDropdownMenuItem_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioDropdownMenu/StudioDropdownMenuItem.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioDropdownMenuItem_module.A, options);
      const StudioDropdownMenu_StudioDropdownMenuItem_module =
          StudioDropdownMenuItem_module.A && StudioDropdownMenuItem_module.A.locals
            ? StudioDropdownMenuItem_module.A.locals
            : void 0,
        StudioDropdownMenuItem = (0, react.forwardRef)(
          ({ children, icon, iconPlacement = 'left', className, onClick, ...rest }, ref) => {
            const { setOpen } = (0, react.useContext)(StudioDropdownMenuContext),
              iconComponent = react.createElement(
                'span',
                {
                  'aria-hidden': !0,
                  className: StudioDropdownMenu_StudioDropdownMenuItem_module.iconWrapper,
                },
                icon,
              );
            return react.createElement(
              DropdownMenu.rI.Item,
              {
                className: classnames_default()(
                  className,
                  StudioDropdownMenu_StudioDropdownMenuItem_module.studioDropdownMenuItem,
                ),
                onClick: (event) => {
                  onClick(event), setOpen(!1);
                },
                ...rest,
                ref,
                icon: !children,
              },
              icon && 'left' === iconPlacement && iconComponent,
              children,
              icon && 'right' === iconPlacement && iconComponent,
            );
          },
        );
      (StudioDropdownMenuItem.displayName = 'StudioDropdownMenu.Item'),
        (StudioDropdownMenuItem.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioDropdownMenu.Item',
          props: {
            iconPlacement: { defaultValue: { value: "'left'", computed: !1 }, required: !1 },
          },
        });
      const StudioDropdownMenu_StudioDropdownMenu = StudioDropdownMenu;
      (StudioDropdownMenu_StudioDropdownMenu.Group = DropdownMenuGroup.I),
        (StudioDropdownMenu_StudioDropdownMenu.Item = StudioDropdownMenuItem),
        (StudioDropdownMenu_StudioDropdownMenu.Group.displayName = 'StudioDropdownMenu.Group'),
        (StudioDropdownMenu_StudioDropdownMenu.Item.displayName = 'StudioDropdownMenu.Item');
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
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioDropdownMenu/StudioDropdownMenuItem.module.css':
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
          '.koNitmgmLAObbyOAs0M8 {\n  display: flex;\n  gap: var(--fds-spacing-1);\n}\n\n.hMvEmBPuZ8xKPKTLc9zI {\n  display: contents;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioDropdownMenu/StudioDropdownMenuItem.module.css',
            ],
            names: [],
            mappings: 'AAAA;EACE,aAAa;EACb,yBAAyB;AAC3B;;AAEA;EACE,iBAAiB;AACnB',
            sourcesContent: [
              '.studioDropdownMenuItem {\n  display: flex;\n  gap: var(--fds-spacing-1);\n}\n\n.iconWrapper {\n  display: contents;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            studioDropdownMenuItem: 'koNitmgmLAObbyOAs0M8',
            iconWrapper: 'hMvEmBPuZ8xKPKTLc9zI',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioDropdownMenu/StudioDropdownMenu.stories.tsx': (
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
        _index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioDropdownMenu/index.ts',
        );
      const ComposedComponent = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _index__WEBPACK_IMPORTED_MODULE_1__.X,
            { anchorButtonProps: { children: args.label } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _index__WEBPACK_IMPORTED_MODULE_1__.X.Group,
              { heading: 'My heading' },
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _index__WEBPACK_IMPORTED_MODULE_1__.X.Item,
                args,
              ),
            ),
          ),
        meta = {
          title: 'StudioDropdownMenu',
          component: ComposedComponent,
          argTypes: {
            placement: {
              control: 'radio',
              options: ['top', 'right', 'bottom', 'left', 'start', 'end'],
            },
          },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(ComposedComponent, args);
      Preview.args = { label: 'My meny label', children: 'Item', placement: 'bottom-start' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <ComposedComponent {...args} />',
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
