/*! For license information please see components-StudioSectionHeader-StudioSectionHeader-mdx.11078804.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [4165, 3663],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/HelpText/HelpText.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { $: () => HelpText });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        Popover = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Popover/index.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const HelpTextIcon = ({ className, filled = !1, openState }) => {
        const d = filled
          ? 'M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0Zm0 16a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-11c2.205 0 4 1.657 4 3.693 0 .986-.416 1.914-1.172 2.612l-.593.54-.294.28c-.477.466-.869.94-.936 1.417l-.01.144v.814h-1.991v-.814c0-1.254.84-2.214 1.675-3.002l.74-.68c.38-.35.59-.816.59-1.31 0-1.024-.901-1.856-2.01-1.856-1.054 0-1.922.755-2.002 1.71l-.006.145H8C8 6.657 9.794 5 12 5Z'
          : 'M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0Zm0 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-11c2.205 0 4 1.657 4 3.693 0 .986-.416 1.914-1.172 2.612l-.593.54-.294.28c-.477.466-.869.94-.936 1.417l-.01.144v.814h-1.991v-.814c0-1.254.84-2.214 1.675-3.002l.74-.68c.38-.35.59-.816.59-1.31 0-1.024-.901-1.856-2.01-1.856-1.054 0-1.922.755-2.002 1.71l-.006.145H8C8 6.657 9.794 5 12 5Z';
        return (0, jsx_runtime.jsx)('svg', {
          'aria-hidden': !0,
          className,
          'data-state': openState ? 'open' : 'closed',
          fill: 'none',
          role: 'img',
          viewBox: '0 0 24 24',
          xmlns: 'http://www.w3.org/2000/svg',
          children: (0, jsx_runtime.jsx)('path', {
            clipRule: 'evenodd',
            d,
            fill: 'currentColor',
            fillRule: 'evenodd',
          }),
        });
      };
      HelpTextIcon.displayName = 'HelpText.Icon';
      const HelpText = ({ title, placement = 'right', portal, className, children, ...rest }) => {
        const size = (0, getSize.Y)(rest.size || 'md'),
          [open, setOpen] = (0, react.useState)(!1);
        return (0, jsx_runtime.jsx)(jsx_runtime.Fragment, {
          children: (0, jsx_runtime.jsxs)(Popover.AM, {
            variant: 'info',
            placement,
            size,
            portal,
            open,
            onClose: () => setOpen(!1),
            children: [
              (0, jsx_runtime.jsx)(Popover.AM.Trigger, {
                asChild: !0,
                variant: 'tertiary',
                children: (0, jsx_runtime.jsxs)('button', {
                  className: (0, lite.$)(
                    `fds-helptext--${size}`,
                    'fds-helptext__button',
                    'fds-focus',
                    className,
                  ),
                  'aria-expanded': open,
                  onClick: () => setOpen(!open),
                  ...rest,
                  children: [
                    (0, jsx_runtime.jsx)(HelpTextIcon, {
                      filled: !0,
                      className: (0, lite.$)(
                        'fds-helptext__icon',
                        'fds-helptext__icon--filled',
                        className,
                      ),
                      openState: open,
                    }),
                    (0, jsx_runtime.jsx)(HelpTextIcon, {
                      className: (0, lite.$)('fds-helptext__icon', className),
                      openState: open,
                    }),
                    (0, jsx_runtime.jsx)('span', { className: 'fds-sr-only', children: title }),
                  ],
                }),
              }),
              (0, jsx_runtime.jsx)(Popover.AM.Content, {
                className: 'fds-helptext__content',
                children,
              }),
            ],
          }),
        });
      };
      HelpText.displayName = 'HelpText';
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Popover/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
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
    './src/components/StudioSectionHeader/StudioSectionHeader.mdx': (
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
        _StudioSectionHeader_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioSectionHeader/StudioSectionHeader.stories.tsx',
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
                { of: _StudioSectionHeader_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioSectionHeader',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'StudioSectionHeader is used to display a header for a config-section in Studio.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioSectionHeader_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioSectionHeader/StudioSectionHeader.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { n: () => StudioSectionHeader });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        Heading = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        HelpText = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/HelpText/HelpText.js',
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
        StudioSectionHeader_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSectionHeader/StudioSectionHeader.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioSectionHeader_module.A, options);
      const StudioSectionHeader_StudioSectionHeader_module =
        StudioSectionHeader_module.A && StudioSectionHeader_module.A.locals
          ? StudioSectionHeader_module.A.locals
          : void 0;
      var classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames);
      const StudioSectionHeader = (0, react.forwardRef)(
        ({ heading, helpText, icon, className: givenClassName, ...rest }, ref) => {
          const className = classnames_default()(
            givenClassName,
            StudioSectionHeader_StudioSectionHeader_module.container,
          );
          return react.createElement(
            'div',
            { ...rest, className, ref },
            react.createElement(
              'div',
              { className: StudioSectionHeader_StudioSectionHeader_module.iconTitleContainer },
              icon || null,
              react.createElement(
                Heading.D,
                { size: 'xxsmall', level: heading.level ?? 2 },
                heading.text,
              ),
            ),
            helpText &&
              react.createElement(
                HelpText.$,
                { size: 'medium', title: helpText.title },
                helpText.text,
              ),
          );
        },
      );
      (StudioSectionHeader.displayName = 'StudioSectionHeader'),
        (StudioSectionHeader.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioSectionHeader',
          props: {
            icon: {
              required: !1,
              tsType: { name: 'ReactReactNode', raw: 'React.ReactNode' },
              description: '',
            },
            heading: {
              required: !0,
              tsType: {
                name: 'signature',
                type: 'object',
                raw: "{\n  text: string;\n  level?: HeadingProps['level'];\n}",
                signature: {
                  properties: [
                    { key: 'text', value: { name: 'string', required: !0 } },
                    {
                      key: 'level',
                      value: {
                        name: "HeadingProps['level']",
                        raw: "HeadingProps['level']",
                        required: !1,
                      },
                    },
                  ],
                },
              },
              description: '',
            },
            helpText: {
              required: !1,
              tsType: {
                name: 'signature',
                type: 'object',
                raw: '{\n  text: string;\n  title: string;\n}',
                signature: {
                  properties: [
                    { key: 'text', value: { name: 'string', required: !0 } },
                    { key: 'title', value: { name: 'string', required: !0 } },
                  ],
                },
              },
              description: '',
            },
          },
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSectionHeader/StudioSectionHeader.module.css':
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
          '.W4Aph1LsV5rqArgyRqbn {\n  display: flex;\n  justify-content: space-between;\n  min-height: var(--fds-spacing-12);\n  box-sizing: border-box;\n  max-height: max-content;\n  gap: var(--fds-spacing-2);\n  padding: var(--fds-spacing-2) var(--fds-spacing-3);\n  background-color: var(--fds-semantic-surface-neutral-selected);\n  border-bottom: 1px solid var(--fds-semantic-border-divider-default);\n}\n\n.kGQ6cwQTAKE4h46oEQGA {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioSectionHeader/StudioSectionHeader.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,aAAa;EACb,8BAA8B;EAC9B,iCAAiC;EACjC,sBAAsB;EACtB,uBAAuB;EACvB,yBAAyB;EACzB,kDAAkD;EAClD,8DAA8D;EAC9D,mEAAmE;AACrE;;AAEA;EACE,aAAa;EACb,mBAAmB;EACnB,yBAAyB;AAC3B',
            sourcesContent: [
              '.container {\n  display: flex;\n  justify-content: space-between;\n  min-height: var(--fds-spacing-12);\n  box-sizing: border-box;\n  max-height: max-content;\n  gap: var(--fds-spacing-2);\n  padding: var(--fds-spacing-2) var(--fds-spacing-3);\n  background-color: var(--fds-semantic-surface-neutral-selected);\n  border-bottom: 1px solid var(--fds-semantic-border-divider-default);\n}\n\n.iconTitleContainer {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            container: 'W4Aph1LsV5rqArgyRqbn',
            iconTitleContainer: 'kGQ6cwQTAKE4h46oEQGA',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioSectionHeader/StudioSectionHeader.stories.tsx': (
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
        _StudioSectionHeader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioSectionHeader/StudioSectionHeader.tsx',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const meta = {
          title: 'StudioSectionHeader',
          component: _StudioSectionHeader__WEBPACK_IMPORTED_MODULE_1__.n,
          argTypes: { icon: { control: !1 } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioSectionHeader__WEBPACK_IMPORTED_MODULE_1__.n,
            args,
          );
      Preview.args = {
        icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__.PencilIcon,
          null,
        ),
        heading: { text: 'Heading', level: 2 },
        helpText: { text: 'My descriptive help text goes here!', title: 'Help text title' },
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioSectionHeader {...args} />',
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
