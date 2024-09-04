/*! For license information please see components-StudioPopover-StudioPopover-stories.8c31320d.iframe.bundle.js.LICENSE.txt */
'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [275],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Popover/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { AM: () => Popover_Popover });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const Popover = ({
          children,
          placement = 'top',
          open,
          variant = 'default',
          portal,
          onOpenChange,
          onClose,
          ...rest
        }) => {
          const size = (0, getSize.Y)(rest.size || 'md'),
            triggerRef = (0, react.useRef)(null),
            [internalOpen, setInternalOpen] = (0, react.useState)(open ?? !1),
            randomPopoverId = (0, react.useId)(),
            [popoverId, setPopoverId] = (0, react.useState)(randomPopoverId),
            randomTriggerId = (0, react.useId)(),
            [triggerId, setTriggerId] = (0, react.useState)(randomTriggerId),
            isControlled = 'boolean' == typeof open;
          react.useEffect(() => {
            setInternalOpen(open ?? !1);
          }, [open]);
          const anchorEl = triggerRef.current;
          return (0, jsx_runtime.jsx)(PopoverContext.Provider, {
            value: {
              triggerRef,
              anchorEl,
              portal,
              internalOpen,
              isControlled,
              setInternalOpen,
              size,
              variant,
              placement,
              onOpenChange,
              onClose,
              popoverId,
              setPopoverId,
              triggerId,
              setTriggerId,
            },
            children,
          });
        },
        PopoverContext = react.createContext({
          size: 'sm',
          variant: 'default',
          anchorEl: null,
          placement: 'top',
          triggerRef: { current: null },
          internalOpen: !1,
          setInternalOpen: () => {},
        });
      Popover.displayName = 'Popover';
      var floating_ui_react = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js',
        ),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        floating_ui_dom = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/dom/dist/floating-ui.dom.js',
        ),
        floating_ui_core = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/core/dist/floating-ui.core.js',
        ),
        floating_ui_react_dom = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.js',
        ),
        useIsomorphicLayoutEffect = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/hooks/useIsomorphicLayoutEffect.js',
        ),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        );
      const ARROW_PLACEMENT = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' },
        PopoverContent = (0, react.forwardRef)(
          ({ className, children, style, id, ...rest }, ref) => {
            const {
                portal,
                internalOpen,
                size,
                isControlled,
                variant,
                placement,
                setInternalOpen,
                onClose,
                onOpenChange,
                anchorEl,
                popoverId,
                setPopoverId,
                triggerId,
              } = (0, react.useContext)(PopoverContext),
              Container = portal ? floating_ui_react.XF : react.Fragment,
              floatingEl = (0, react.useRef)(null),
              arrowRef = (0, react.useRef)(null);
            (0, react.useEffect)(() => {
              id && setPopoverId?.(id);
            }, [id, setPopoverId]);
            const {
                context,
                update,
                refs,
                floatingStyles,
                placement: flPlacement,
                middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
              } = (0, floating_ui_react.we)({
                placement,
                open: internalOpen,
                onOpenChange: (localOpen) => {
                  onOpenChange && onOpenChange(localOpen),
                    localOpen || (onClose && onClose()),
                    isControlled || setInternalOpen(localOpen);
                },
                whileElementsMounted: floating_ui_dom.ll,
                elements: { reference: anchorEl ?? void 0, floating: floatingEl.current },
                middleware: [
                  (0, floating_ui_core.cY)(11),
                  (0, floating_ui_dom.UU)({ fallbackAxisSideDirection: 'start' }),
                  (0, floating_ui_dom.BN)(),
                  (0, floating_ui_react_dom.UE)({ element: arrowRef }),
                ],
              }),
              { getFloatingProps } = (0, floating_ui_react.bv)([
                (0, floating_ui_react.iQ)(context),
                (0, floating_ui_react.kp)(context),
                (0, floating_ui_react.s9)(context),
                (0, floating_ui_react.It)(context),
              ]),
              floatingRef = (0, floating_ui_react.SV)([refs.setFloating, ref]);
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
            const arrowPlacement = (0, react.useMemo)(
              () => ARROW_PLACEMENT[flPlacement.split('-')[0]],
              [flPlacement],
            );
            return (0, jsx_runtime.jsx)(jsx_runtime.Fragment, {
              children:
                internalOpen &&
                (0, jsx_runtime.jsx)(Container, {
                  children: (0, jsx_runtime.jsx)(Paragraph.f, {
                    asChild: !0,
                    size,
                    children: (0, jsx_runtime.jsxs)('div', {
                      ref: floatingEl,
                      className: (0, lite.$)(
                        'fds-popover',
                        `fds-popover--${variant}`,
                        `fds-popover--${size}`,
                        className,
                      ),
                      'data-placement': flPlacement,
                      ...getFloatingProps({ ref: floatingRef, tabIndex: void 0 }),
                      style: { ...floatingStyles, ...style },
                      id: popoverId,
                      'aria-labelledby': triggerId,
                      ...rest,
                      children: [
                        children,
                        (0, jsx_runtime.jsx)('div', {
                          ref: arrowRef,
                          className: (0, lite.$)(
                            'fds-popover__arrow',
                            `fds-popover__arrow--${arrowPlacement}`,
                          ),
                          style: {
                            height: 7,
                            width: 7,
                            ...(null != arrowX ? { left: arrowX } : {}),
                            ...(null != arrowY ? { top: arrowY } : {}),
                            ...(arrowPlacement ? { [arrowPlacement]: -4.5 } : {}),
                          },
                        }),
                      ],
                    }),
                  }),
                }),
            });
          },
        );
      PopoverContent.displayName = 'Popover.Content';
      var dist = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
        ),
        Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        );
      const PopoverTrigger = (0, react.forwardRef)(({ id, asChild, ...rest }, ref) => {
        const {
            triggerRef,
            internalOpen,
            setInternalOpen,
            isControlled,
            popoverId,
            triggerId,
            setTriggerId,
          } = (0, react.useContext)(PopoverContext),
          mergedRefs = (0, floating_ui_react.SV)([ref, triggerRef]);
        (0, react.useEffect)(() => {
          id && setTriggerId?.(id);
        }, [id, setTriggerId]);
        const Component = asChild ? dist.D : Button.$;
        return (0, jsx_runtime.jsx)(Component, {
          ref: mergedRefs,
          onClick: () => {
            isControlled || setInternalOpen(!internalOpen);
          },
          'aria-expanded': internalOpen,
          'aria-controls': internalOpen ? popoverId : void 0,
          id: triggerId,
          ...rest,
        });
      });
      PopoverTrigger.displayName = 'PopoverTrigger';
      const Popover_Popover = Popover;
      (Popover_Popover.Content = PopoverContent),
        (Popover_Popover.Trigger = PopoverTrigger),
        (Popover_Popover.Content.displayName = 'Popover.Content'),
        (Popover_Popover.Trigger.displayName = 'Popover.Trigger');
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
    './src/components/StudioPopover/StudioPopover.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { mu: () => StudioPopover });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Popover/index.js',
        );
      const StudioPopoverTrigger = ({ ...rest }) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.AM.Trigger,
            rest,
          ),
        StudioPopoverContent = ({ ...rest }) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.AM.Content,
            rest,
          ),
        StudioPopoverRoot = ({ ...rest }) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_1__.AM,
            rest,
          ),
        StudioPopover = StudioPopoverRoot;
      (StudioPopover.Trigger = StudioPopoverTrigger),
        (StudioPopover.Content = StudioPopoverContent),
        (StudioPopoverRoot.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioPopoverRoot',
        }),
        (StudioPopoverTrigger.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioPopoverTrigger',
        }),
        (StudioPopoverContent.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioPopoverContent',
        });
    },
    './src/components/StudioPopover/StudioPopover.stories.tsx': (
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
        _StudioPopover__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioPopover/StudioPopover.tsx',
        );
      const meta = {
          title: 'StudioPopover',
          component: _StudioPopover__WEBPACK_IMPORTED_MODULE_1__.mu,
          argTypes: {
            placement: {
              control: 'select',
              options: [
                'top',
                'right',
                'bottom',
                'left',
                'top-start',
                'top-end',
                'right-start',
                'right-end',
                'bottom-start',
                'bottom-end',
                'left-start',
                'left-end',
              ],
            },
            variant: { control: 'radio', options: ['default', 'danger', 'info', 'warning'] },
            size: { control: 'select', options: ['small', 'medium', 'large'] },
          },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioPopover__WEBPACK_IMPORTED_MODULE_1__.mu,
            args,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioPopover__WEBPACK_IMPORTED_MODULE_1__.mu.Trigger,
              null,
              'My trigger!',
            ),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioPopover__WEBPACK_IMPORTED_MODULE_1__.mu.Content,
              null,
              'StudioPopover content',
            ),
          );
      Preview.args = {
        placement: 'top',
        variant: 'default',
        size: 'medium',
        onOpenChange: () => {},
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              '(args): React.ReactElement => {\n  return <StudioPopover {...args}>\n      <StudioPopover.Trigger>My trigger!</StudioPopover.Trigger>\n      <StudioPopover.Content>StudioPopover content</StudioPopover.Content>\n    </StudioPopover>;\n}',
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
