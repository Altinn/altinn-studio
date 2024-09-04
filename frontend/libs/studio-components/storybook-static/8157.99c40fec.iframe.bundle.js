'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [8157],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Alert/Alert.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { F: () => Alert });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        useId = __webpack_require__(
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
      const InformationSquareFill = (0, react.forwardRef)((_a, ref) => {
        var { title, titleId: _titleId } = _a,
          props = __rest(_a, ['title', 'titleId']);
        let titleId = (0, useId.B)();
        return (
          (titleId = title ? _titleId || 'title-' + titleId : void 0),
          react.createElement(
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
            title ? react.createElement('title', { id: titleId }, title) : null,
            react.createElement('path', {
              fillRule: 'evenodd',
              clipRule: 'evenodd',
              d: 'M3.25 4A.75.75 0 0 1 4 3.25h16a.75.75 0 0 1 .75.75v16a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.75-.75V4ZM11 7.75a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm-1.25 3a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 .75.75v4.75h.75a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h.75v-4h-.75a.75.75 0 0 1-.75-.75Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var ExclamationmarkTriangleFill_rest = function (s, e) {
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
      const ExclamationmarkTriangleFill = (0, react.forwardRef)((_a, ref) => {
        var { title, titleId: _titleId } = _a,
          props = ExclamationmarkTriangleFill_rest(_a, ['title', 'titleId']);
        let titleId = (0, useId.B)();
        return (
          (titleId = title ? _titleId || 'title-' + titleId : void 0),
          react.createElement(
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
            title ? react.createElement('title', { id: titleId }, title) : null,
            react.createElement('path', {
              fillRule: 'evenodd',
              clipRule: 'evenodd',
              d: 'M12 2.25a.75.75 0 0 1 .656.387l9.527 17.25A.75.75 0 0 1 21.526 21H2.474a.75.75 0 0 1-.657-1.113l9.526-17.25A.75.75 0 0 1 12 2.25ZM12 8.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm-1 7.75a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var CheckmarkCircleFill_rest = function (s, e) {
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
      const CheckmarkCircleFill = (0, react.forwardRef)((_a, ref) => {
        var { title, titleId: _titleId } = _a,
          props = CheckmarkCircleFill_rest(_a, ['title', 'titleId']);
        let titleId = (0, useId.B)();
        return (
          (titleId = title ? _titleId || 'title-' + titleId : void 0),
          react.createElement(
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
            title ? react.createElement('title', { id: titleId }, title) : null,
            react.createElement('path', {
              fillRule: 'evenodd',
              clipRule: 'evenodd',
              d: 'M12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25 2.25 6.615 2.25 12s4.365 9.75 9.75 9.75Zm4.954-12.475a.813.813 0 0 0-1.24-1.05l-5.389 6.368L7.7 11.967a.812.812 0 0 0-1.15 1.15l3.25 3.25a.812.812 0 0 0 1.195-.05l5.959-7.042Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var XMarkOctagonFill_rest = function (s, e) {
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
      const XMarkOctagonFill = (0, react.forwardRef)((_a, ref) => {
        var { title, titleId: _titleId } = _a,
          props = XMarkOctagonFill_rest(_a, ['title', 'titleId']);
        let titleId = (0, useId.B)();
        return (
          (titleId = title ? _titleId || 'title-' + titleId : void 0),
          react.createElement(
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
            title ? react.createElement('title', { id: titleId }, title) : null,
            react.createElement('path', {
              fillRule: 'evenodd',
              clipRule: 'evenodd',
              d: 'M7.742 2.47a.75.75 0 0 1 .53-.22h7.456a.75.75 0 0 1 .53.22l5.272 5.272c.141.14.22.331.22.53v7.456a.75.75 0 0 1-.22.53l-5.272 5.272a.75.75 0 0 1-.53.22H8.272a.75.75 0 0 1-.53-.22L2.47 16.258a.75.75 0 0 1-.22-.53V8.272a.75.75 0 0 1 .22-.53L7.742 2.47Zm1.288 5.5a.75.75 0 0 0-1.06 1.06L10.94 12l-2.97 2.97a.75.75 0 1 0 1.06 1.06L12 13.06l2.97 2.97a.75.75 0 1 0 1.06-1.06L13.06 12l2.97-2.97a.75.75 0 0 0-1.06-1.06L12 10.94 9.03 7.97Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        );
      const icons = {
          info: { Icon: InformationSquareFill, title: 'Informasjon' },
          warning: { Icon: ExclamationmarkTriangleFill, title: 'Advarsel' },
          success: { Icon: CheckmarkCircleFill, title: 'Suksess' },
          danger: { Icon: XMarkOctagonFill, title: 'Feil' },
        },
        Alert = (0, react.forwardRef)(
          ({ severity = 'info', elevated, iconTitle, children, className, ...rest }, ref) => {
            const size = (0, getSize.Y)(rest.size || 'md'),
              { Icon, title } = icons[severity];
            return (0, jsx_runtime.jsx)('div', {
              ref,
              className: (0, lite.$)(
                'fds-alert',
                `fds-alert--${size}`,
                `fds-alert--${severity}`,
                elevated && 'fds-alert--elevated',
                className,
              ),
              ...rest,
              children: (0, jsx_runtime.jsxs)(jsx_runtime.Fragment, {
                children: [
                  (0, jsx_runtime.jsx)(Icon, {
                    title: iconTitle || title,
                    className: 'fds-alert__icon',
                  }),
                  (0, jsx_runtime.jsx)(Paragraph.f, {
                    asChild: !0,
                    size,
                    className: 'fds-alert__content',
                    children: (0, jsx_runtime.jsx)('span', { children }),
                  }),
                ],
              }),
            });
          },
        );
      Alert.displayName = 'Alert';
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Card/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { Zp: () => Card_Card });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        dist = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
        );
      const CardHeader = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
        const Component = asChild ? dist.D : 'div';
        return (0, jsx_runtime.jsx)(Component, {
          className: (0, lite.$)('fds-card__header', className),
          ref,
          ...rest,
        });
      });
      CardHeader.displayName = 'CardHeader';
      const CardContent = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
        const Component = asChild ? dist.D : 'div';
        return (0, jsx_runtime.jsx)(Component, {
          className: (0, lite.$)('fds-card__content', className),
          ref,
          ...rest,
        });
      });
      CardContent.displayName = 'CardContent';
      const CardFooter = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
        const Component = asChild ? dist.D : 'div';
        return (0, jsx_runtime.jsx)(Component, {
          className: (0, lite.$)('fds-card__footer', className),
          ref,
          ...rest,
        });
      });
      CardFooter.displayName = 'CardFooter';
      const Card = (0, react.forwardRef)(
        ({ color = 'neutral', isLink = !1, asChild = !1, className, ...rest }, ref) => {
          const Component = asChild ? dist.D : 'div';
          return (0, jsx_runtime.jsx)(Component, {
            ref,
            className: (0, lite.$)(
              'fds-card',
              `fds-card--${color}`,
              isLink && 'fds-card--link',
              isLink && 'fds-focus',
              className,
            ),
            ...rest,
          });
        },
      );
      Card.displayName = 'Card';
      const CardMedia = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
        const Component = asChild ? dist.D : 'div';
        return (0, jsx_runtime.jsx)(Component, {
          className: (0, lite.$)('fds-card__media', className),
          ref,
          ...rest,
        });
      });
      CardMedia.displayName = 'CardMedia';
      const Card_Card = Card;
      (Card_Card.Header = CardHeader),
        (Card_Card.Content = CardContent),
        (Card_Card.Footer = CardFooter),
        (Card_Card.Media = CardMedia),
        (Card_Card.Header.displayName = 'Card.Header'),
        (Card_Card.Content.displayName = 'Card.Content'),
        (Card_Card.Footer.displayName = 'Card.Footer'),
        (Card_Card.Media.displayName = 'Card.Media');
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/DropdownMenu/DropdownMenu.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/HelpText/HelpText.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Link/Link.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { N: () => Link });
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          );
      const Link = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        ({ asChild, children, className, inverted = !1, ...rest }, ref) => {
          const Component = asChild
            ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
            : 'a';
          return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
            className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_3__.$)(
              'fds-link',
              inverted && 'fds-link--inverted',
              className,
            ),
            ref,
            ...rest,
            children,
          });
        },
      );
      Link.displayName = 'Link';
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/List/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { B8: () => List });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        dist = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const ListContext = (0, react.createContext)({
          size: 'md',
          headingId: 'heading',
          setHeadingId: () => {},
        }),
        ListRoot = (0, react.forwardRef)(({ asChild, ...rest }, ref) => {
          const [headingId, setHeadingId] = (0, react.useState)(),
            Component = asChild ? dist.D : 'div',
            size = (0, getSize.Y)(rest.size || 'md');
          return (0, jsx_runtime.jsx)(ListContext.Provider, {
            value: { size, headingId, setHeadingId },
            children: (0, jsx_runtime.jsx)(Component, { ref, ...rest }),
          });
        });
      ListRoot.displayName = 'ListRoot';
      var lite = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
      );
      const ListItem = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
        const Component = asChild ? dist.D : 'li';
        return (0, jsx_runtime.jsx)(Component, {
          className: (0, lite.$)('fds-list__item', className),
          ...rest,
          ref,
        });
      });
      ListItem.displayName = 'ListItem';
      var Heading = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
      );
      const HEADING_SIZE_MAP = { sm: '2xs', md: 'xs', lg: 'sm' },
        ListHeading = (0, react.forwardRef)(({ level = 2, id, ...rest }, ref) => {
          const { size, headingId, setHeadingId } = (0, react.useContext)(ListContext),
            randomId = (0, react.useId)(),
            headingId_ = id ?? randomId,
            headingSize = (0, react.useMemo)(() => HEADING_SIZE_MAP[size], [size]);
          return (
            (0, react.useEffect)(() => {
              headingId !== headingId_ && setHeadingId(headingId_);
            }, [headingId, id, setHeadingId, headingId_]),
            (0, jsx_runtime.jsx)(Heading.D, {
              ref,
              size: headingSize,
              id: headingId,
              level,
              spacing: !0,
              ...rest,
            })
          );
        });
      ListHeading.displayName = 'ListHeading';
      var Paragraph = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
      );
      const Unordered = (0, react.forwardRef)(({ asChild, ...rest }, ref) => {
        const { size, headingId } = (0, react.useContext)(ListContext),
          Component = asChild ? dist.D : 'ul';
        return (0, jsx_runtime.jsx)(Paragraph.f, {
          size,
          asChild: !0,
          children: (0, jsx_runtime.jsx)(Component, {
            className: (0, lite.$)('fds-list', `fds-list--${size}`, rest.className),
            ...(headingId ? { 'aria-labelledby': headingId } : {}),
            ref,
            ...rest,
          }),
        });
      });
      Unordered.displayName = 'ListUnordered';
      const Ordered = (0, react.forwardRef)(({ asChild, ...rest }, ref) => {
        const { size, headingId } = (0, react.useContext)(ListContext),
          Component = asChild ? dist.D : 'ol';
        return (0, jsx_runtime.jsx)(Paragraph.f, {
          size,
          asChild: !0,
          children: (0, jsx_runtime.jsx)(Component, {
            className: (0, lite.$)('fds-list', `fds-list--${size}`, rest.className),
            ...(headingId ? { 'aria-labelledby': headingId } : {}),
            ref,
            ...rest,
          }),
        });
      });
      Ordered.displayName = 'ListOrdered';
      const List = {};
      (List.Root = ListRoot),
        (List.Item = ListItem),
        (List.Heading = ListHeading),
        (List.Ordered = Ordered),
        (List.Unordered = Unordered),
        (List.Root.displayName = 'List.Root'),
        (List.Item.displayName = 'List.Item'),
        (List.Heading.displayName = 'List.Heading'),
        (List.Ordered.displayName = 'List.Ordered'),
        (List.Unordered.displayName = 'List.Unordered');
    },
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Tabs/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { tU: () => Tabs_Tabs });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const TabsContext = (0, react.createContext)({}),
        Tabs = (0, react.forwardRef)(
          ({ children, value, defaultValue, className, onChange, ...rest }, ref) => {
            const size = (0, getSize.Y)(rest.size || 'md'),
              isControlled = void 0 !== value,
              [uncontrolledValue, setUncontrolledValue] = (0, react.useState)(defaultValue);
            let onValueChange = onChange;
            return (
              isControlled ||
                ((onValueChange = (newValue) => {
                  setUncontrolledValue(newValue), onChange?.(newValue);
                }),
                (value = uncontrolledValue)),
              (0, jsx_runtime.jsx)(TabsContext.Provider, {
                value: { value, defaultValue, onChange: onValueChange },
                children: (0, jsx_runtime.jsx)('div', {
                  className: (0, lite.$)(`fds-tabs--${size}`, className),
                  ref,
                  ...rest,
                  children,
                }),
              })
            );
          },
        );
      Tabs.displayName = 'Tabs';
      var RovingTabindexItem = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexItem.js',
      );
      const Tab = (0, react.forwardRef)((props, ref) => {
        const { children, className, ...rest } = props,
          { ...useTabRest } = ((props) => {
            const { value, ...rest } = props,
              tabs = (0, react.useContext)(TabsContext);
            return {
              ...rest,
              id: `tab-${(0, react.useId)()}`,
              'aria-selected': tabs.value == value,
              role: 'tab',
              onClick: () => {
                tabs.onChange?.(value);
              },
            };
          })(props);
        return (0, jsx_runtime.jsx)(RovingTabindexItem.o_, {
          ...rest,
          asChild: !0,
          children: (0, jsx_runtime.jsx)('button', {
            ...useTabRest,
            className: (0, lite.$)('fds-tabs__tab', className),
            ref,
            children,
          }),
        });
      });
      Tab.displayName = 'Tab';
      var RovingTabindexRoot = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/RovingTabIndex/RovingTabindexRoot.js',
      );
      const TabList = (0, react.forwardRef)(({ children, className, ...rest }, ref) =>
        (0, jsx_runtime.jsx)(RovingTabindexRoot.D, {
          role: 'tablist',
          className: (0, lite.$)('fds-tabs__tablist', className),
          ref,
          ...rest,
          children,
        }),
      );
      TabList.displayName = 'TabList';
      const TabContent = (0, react.forwardRef)(({ children, value, className, ...rest }, ref) => {
        const { value: tabsValue } = (0, react.useContext)(TabsContext),
          active = value == tabsValue;
        return (0, jsx_runtime.jsx)(jsx_runtime.Fragment, {
          children:
            active &&
            (0, jsx_runtime.jsx)('div', {
              className: (0, lite.$)('fds-tabs__content', className),
              ref,
              ...rest,
              children,
            }),
        });
      });
      TabContent.displayName = 'TabContent';
      const Tabs_Tabs = Tabs;
      (Tabs_Tabs.Tab = Tab),
        (Tabs_Tabs.List = TabList),
        (Tabs_Tabs.Content = TabContent),
        (Tabs_Tabs.Tab.displayName = 'Tabs.Tab'),
        (Tabs_Tabs.List.displayName = 'Tabs.List'),
        (Tabs_Tabs.Content.displayName = 'Tabs.Content');
    },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Tag/Tag.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { v: () => Tag });
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        _Typography_Paragraph_Paragraph_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        );
      const Tag = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        ({ children, color = 'neutral', className, ...rest }, ref) => {
          const size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(rest.size || 'md');
          return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
            _Typography_Paragraph_Paragraph_js__WEBPACK_IMPORTED_MODULE_3__.f,
            {
              asChild: !0,
              size,
              children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)('span', {
                className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                  'fds-tag',
                  `fds-tag--${color}`,
                  `fds-tag--${size}`,
                  className,
                ),
                ref,
                ...rest,
                children,
              }),
            },
          );
        },
      );
      Tag.displayName = 'Tag';
    },
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/CharacterCounter.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { c: () => CharacterCounter });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          _Typography_ErrorMessage_ErrorMessage_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
            );
        const defaultLabel = (count) =>
            count > -1 ? `${count} tegn igjen` : `${Math.abs(count)} tegn for mye`,
          CharacterCounter = ({
            label = defaultLabel,
            srLabel: propsSrLabel,
            maxCount,
            value,
            id,
            size,
          }) => {
            const currentCount = maxCount - value.length,
              hasExceededLimit = value.length > maxCount,
              srLabel =
                propsSrLabel ||
                ((maxCount) => `Tekstfelt med plass til ${maxCount} tegn`)(maxCount);
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(
              react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment,
              {
                children: [
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)('span', {
                    className: 'fds-sr-only',
                    id,
                    children: srLabel,
                  }),
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(
                    _Typography_ErrorMessage_ErrorMessage_js__WEBPACK_IMPORTED_MODULE_1__.K,
                    {
                      asChild: !0,
                      size,
                      error: hasExceededLimit,
                      children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)('span', {
                        'aria-live': hasExceededLimit ? 'polite' : 'off',
                        children: label(currentCount),
                      }),
                    },
                  ),
                ],
              },
            );
          };
        CharacterCounter.displayName = 'CharacterCounter';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Combobox/index.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { G3: () => Combobox_Combobox });
        var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          floating_ui_react = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js',
          ),
          lite = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          react_dom = __webpack_require__('../../../node_modules/react-dom/index.js');
        function memo(getDeps, fn, opts) {
          let result,
            deps = opts.initialDeps ?? [];
          return () => {
            var _a, _b, _c, _d;
            let depTime;
            opts.key &&
              (null == (_a = opts.debug) ? void 0 : _a.call(opts)) &&
              (depTime = Date.now());
            const newDeps = getDeps();
            if (
              !(newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep))
            )
              return result;
            let resultTime;
            if (
              ((deps = newDeps),
              opts.key &&
                (null == (_b = opts.debug) ? void 0 : _b.call(opts)) &&
                (resultTime = Date.now()),
              (result = fn(...newDeps)),
              opts.key && (null == (_c = opts.debug) ? void 0 : _c.call(opts)))
            ) {
              const depEndTime = Math.round(100 * (Date.now() - depTime)) / 100,
                resultEndTime = Math.round(100 * (Date.now() - resultTime)) / 100,
                resultFpsPercentage = resultEndTime / 16,
                pad = (str, num) => {
                  for (str = String(str); str.length < num; ) str = ' ' + str;
                  return str;
                };
              console.info(
                `%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
                `\n            font-size: .6rem;\n            font-weight: bold;\n            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`,
                null == opts ? void 0 : opts.key,
              );
            }
            return (
              null == (_d = null == opts ? void 0 : opts.onChange) || _d.call(opts, result), result
            );
          };
        }
        function notUndefined(value, msg) {
          if (void 0 === value) throw new Error('Unexpected undefined' + (msg ? `: ${msg}` : ''));
          return value;
        }
        const defaultKeyExtractor = (index) => index,
          defaultRangeExtractor = (range) => {
            const start = Math.max(range.startIndex - range.overscan, 0),
              end = Math.min(range.endIndex + range.overscan, range.count - 1),
              arr = [];
            for (let i = start; i <= end; i++) arr.push(i);
            return arr;
          },
          observeElementRect = (instance, cb) => {
            const element = instance.scrollElement;
            if (!element) return;
            const handler = (rect) => {
              const { width, height } = rect;
              cb({ width: Math.round(width), height: Math.round(height) });
            };
            if ((handler(element.getBoundingClientRect()), 'undefined' == typeof ResizeObserver))
              return () => {};
            const observer = new ResizeObserver((entries) => {
              const entry = entries[0];
              if (null == entry ? void 0 : entry.borderBoxSize) {
                const box = entry.borderBoxSize[0];
                if (box) return void handler({ width: box.inlineSize, height: box.blockSize });
              }
              handler(element.getBoundingClientRect());
            });
            return (
              observer.observe(element, { box: 'border-box' }),
              () => {
                observer.unobserve(element);
              }
            );
          },
          observeElementOffset = (instance, cb) => {
            const element = instance.scrollElement;
            if (!element) return;
            const handler = () => {
              cb(element[instance.options.horizontal ? 'scrollLeft' : 'scrollTop']);
            };
            return (
              handler(),
              element.addEventListener('scroll', handler, { passive: !0 }),
              () => {
                element.removeEventListener('scroll', handler);
              }
            );
          },
          measureElement = (element, entry, instance) => {
            if (null == entry ? void 0 : entry.borderBoxSize) {
              const box = entry.borderBoxSize[0];
              if (box) {
                return Math.round(box[instance.options.horizontal ? 'inlineSize' : 'blockSize']);
              }
            }
            return Math.round(
              element.getBoundingClientRect()[instance.options.horizontal ? 'width' : 'height'],
            );
          },
          elementScroll = (offset, { adjustments = 0, behavior }, instance) => {
            var _a, _b;
            const toOffset = offset + adjustments;
            null == (_b = null == (_a = instance.scrollElement) ? void 0 : _a.scrollTo) ||
              _b.call(_a, { [instance.options.horizontal ? 'left' : 'top']: toOffset, behavior });
          };
        class Virtualizer {
          constructor(opts) {
            (this.unsubs = []),
              (this.scrollElement = null),
              (this.isScrolling = !1),
              (this.isScrollingTimeoutId = null),
              (this.scrollToIndexTimeoutId = null),
              (this.measurementsCache = []),
              (this.itemSizeCache = new Map()),
              (this.pendingMeasuredCacheIndexes = []),
              (this.scrollDirection = null),
              (this.scrollAdjustments = 0),
              (this.measureElementCache = new Map()),
              (this.observer = (() => {
                let _ro = null;
                const get = () =>
                  _ro ||
                  ('undefined' != typeof ResizeObserver
                    ? (_ro = new ResizeObserver((entries) => {
                        entries.forEach((entry) => {
                          this._measureElement(entry.target, entry);
                        });
                      }))
                    : null);
                return {
                  disconnect: () => {
                    var _a;
                    return null == (_a = get()) ? void 0 : _a.disconnect();
                  },
                  observe: (target) => {
                    var _a;
                    return null == (_a = get())
                      ? void 0
                      : _a.observe(target, { box: 'border-box' });
                  },
                  unobserve: (target) => {
                    var _a;
                    return null == (_a = get()) ? void 0 : _a.unobserve(target);
                  },
                };
              })()),
              (this.range = null),
              (this.setOptions = (opts2) => {
                Object.entries(opts2).forEach(([key, value]) => {
                  void 0 === value && delete opts2[key];
                }),
                  (this.options = {
                    debug: !1,
                    initialOffset: 0,
                    overscan: 1,
                    paddingStart: 0,
                    paddingEnd: 0,
                    scrollPaddingStart: 0,
                    scrollPaddingEnd: 0,
                    horizontal: !1,
                    getItemKey: defaultKeyExtractor,
                    rangeExtractor: defaultRangeExtractor,
                    onChange: () => {},
                    measureElement,
                    initialRect: { width: 0, height: 0 },
                    scrollMargin: 0,
                    gap: 0,
                    scrollingDelay: 150,
                    indexAttribute: 'data-index',
                    initialMeasurementsCache: [],
                    lanes: 1,
                    ...opts2,
                  });
              }),
              (this.notify = (sync) => {
                var _a, _b;
                null == (_b = (_a = this.options).onChange) || _b.call(_a, this, sync);
              }),
              (this.maybeNotify = memo(
                () => (
                  this.calculateRange(),
                  [
                    this.isScrolling,
                    this.range ? this.range.startIndex : null,
                    this.range ? this.range.endIndex : null,
                  ]
                ),
                (isScrolling) => {
                  this.notify(isScrolling);
                },
                {
                  key: !1,
                  debug: () => this.options.debug,
                  initialDeps: [
                    this.isScrolling,
                    this.range ? this.range.startIndex : null,
                    this.range ? this.range.endIndex : null,
                  ],
                },
              )),
              (this.cleanup = () => {
                this.unsubs.filter(Boolean).forEach((d) => d()),
                  (this.unsubs = []),
                  (this.scrollElement = null);
              }),
              (this._didMount = () => (
                this.measureElementCache.forEach(this.observer.observe),
                () => {
                  this.observer.disconnect(), this.cleanup();
                }
              )),
              (this._willUpdate = () => {
                const scrollElement = this.options.getScrollElement();
                this.scrollElement !== scrollElement &&
                  (this.cleanup(),
                  (this.scrollElement = scrollElement),
                  this._scrollToOffset(this.scrollOffset, {
                    adjustments: void 0,
                    behavior: void 0,
                  }),
                  this.unsubs.push(
                    this.options.observeElementRect(this, (rect) => {
                      (this.scrollRect = rect), this.maybeNotify();
                    }),
                  ),
                  this.unsubs.push(
                    this.options.observeElementOffset(this, (offset) => {
                      (this.scrollAdjustments = 0),
                        this.scrollOffset !== offset &&
                          (null !== this.isScrollingTimeoutId &&
                            (clearTimeout(this.isScrollingTimeoutId),
                            (this.isScrollingTimeoutId = null)),
                          (this.isScrolling = !0),
                          (this.scrollDirection =
                            this.scrollOffset < offset ? 'forward' : 'backward'),
                          (this.scrollOffset = offset),
                          this.maybeNotify(),
                          (this.isScrollingTimeoutId = setTimeout(() => {
                            (this.isScrollingTimeoutId = null),
                              (this.isScrolling = !1),
                              (this.scrollDirection = null),
                              this.maybeNotify();
                          }, this.options.scrollingDelay)));
                    }),
                  ));
              }),
              (this.getSize = () => this.scrollRect[this.options.horizontal ? 'width' : 'height']),
              (this.memoOptions = memo(
                () => [
                  this.options.count,
                  this.options.paddingStart,
                  this.options.scrollMargin,
                  this.options.getItemKey,
                ],
                (count, paddingStart, scrollMargin, getItemKey) => (
                  (this.pendingMeasuredCacheIndexes = []),
                  { count, paddingStart, scrollMargin, getItemKey }
                ),
                { key: !1 },
              )),
              (this.getFurthestMeasurement = (measurements, index) => {
                const furthestMeasurementsFound = new Map(),
                  furthestMeasurements = new Map();
                for (let m = index - 1; m >= 0; m--) {
                  const measurement = measurements[m];
                  if (furthestMeasurementsFound.has(measurement.lane)) continue;
                  const previousFurthestMeasurement = furthestMeasurements.get(measurement.lane);
                  if (
                    (null == previousFurthestMeasurement ||
                    measurement.end > previousFurthestMeasurement.end
                      ? furthestMeasurements.set(measurement.lane, measurement)
                      : measurement.end < previousFurthestMeasurement.end &&
                        furthestMeasurementsFound.set(measurement.lane, !0),
                    furthestMeasurementsFound.size === this.options.lanes)
                  )
                    break;
                }
                return furthestMeasurements.size === this.options.lanes
                  ? Array.from(furthestMeasurements.values()).sort((a, b) =>
                      a.end === b.end ? a.index - b.index : a.end - b.end,
                    )[0]
                  : void 0;
              }),
              (this.getMeasurements = memo(
                () => [this.memoOptions(), this.itemSizeCache],
                ({ count, paddingStart, scrollMargin, getItemKey }, itemSizeCache) => {
                  const min =
                    this.pendingMeasuredCacheIndexes.length > 0
                      ? Math.min(...this.pendingMeasuredCacheIndexes)
                      : 0;
                  this.pendingMeasuredCacheIndexes = [];
                  const measurements = this.measurementsCache.slice(0, min);
                  for (let i = min; i < count; i++) {
                    const key = getItemKey(i),
                      furthestMeasurement =
                        1 === this.options.lanes
                          ? measurements[i - 1]
                          : this.getFurthestMeasurement(measurements, i),
                      start = furthestMeasurement
                        ? furthestMeasurement.end + this.options.gap
                        : paddingStart + scrollMargin,
                      measuredSize = itemSizeCache.get(key),
                      size =
                        'number' == typeof measuredSize
                          ? measuredSize
                          : this.options.estimateSize(i),
                      end = start + size,
                      lane = furthestMeasurement
                        ? furthestMeasurement.lane
                        : i % this.options.lanes;
                    measurements[i] = { index: i, start, size, end, key, lane };
                  }
                  return (this.measurementsCache = measurements), measurements;
                },
                { key: !1, debug: () => this.options.debug },
              )),
              (this.calculateRange = memo(
                () => [this.getMeasurements(), this.getSize(), this.scrollOffset],
                (measurements, outerSize, scrollOffset) =>
                  (this.range =
                    measurements.length > 0 && outerSize > 0
                      ? (function calculateRange({ measurements, outerSize, scrollOffset }) {
                          const count = measurements.length - 1,
                            getOffset = (index) => measurements[index].start,
                            startIndex = findNearestBinarySearch(0, count, getOffset, scrollOffset);
                          let endIndex = startIndex;
                          for (
                            ;
                            endIndex < count &&
                            measurements[endIndex].end < scrollOffset + outerSize;

                          )
                            endIndex++;
                          return { startIndex, endIndex };
                        })({ measurements, outerSize, scrollOffset })
                      : null),
                { key: !1, debug: () => this.options.debug },
              )),
              (this.getIndexes = memo(
                () => [
                  this.options.rangeExtractor,
                  this.calculateRange(),
                  this.options.overscan,
                  this.options.count,
                ],
                (rangeExtractor, range, overscan, count) =>
                  null === range ? [] : rangeExtractor({ ...range, overscan, count }),
                { key: !1, debug: () => this.options.debug },
              )),
              (this.indexFromElement = (node) => {
                const attributeName = this.options.indexAttribute,
                  indexStr = node.getAttribute(attributeName);
                return indexStr
                  ? parseInt(indexStr, 10)
                  : (console.warn(
                      `Missing attribute name '${attributeName}={index}' on measured element.`,
                    ),
                    -1);
              }),
              (this._measureElement = (node, entry) => {
                const item = this.measurementsCache[this.indexFromElement(node)];
                if (!item || !node.isConnected)
                  return void this.measureElementCache.forEach((cached, key) => {
                    cached === node &&
                      (this.observer.unobserve(node), this.measureElementCache.delete(key));
                  });
                const prevNode = this.measureElementCache.get(item.key);
                prevNode !== node &&
                  (prevNode && this.observer.unobserve(prevNode),
                  this.observer.observe(node),
                  this.measureElementCache.set(item.key, node));
                const measuredItemSize = this.options.measureElement(node, entry, this);
                this.resizeItem(item, measuredItemSize);
              }),
              (this.resizeItem = (item, size) => {
                const delta = size - (this.itemSizeCache.get(item.key) ?? item.size);
                0 !== delta &&
                  (item.start < this.scrollOffset + this.scrollAdjustments &&
                    this._scrollToOffset(this.scrollOffset, {
                      adjustments: (this.scrollAdjustments += delta),
                      behavior: void 0,
                    }),
                  this.pendingMeasuredCacheIndexes.push(item.index),
                  (this.itemSizeCache = new Map(this.itemSizeCache.set(item.key, size))),
                  this.notify(!1));
              }),
              (this.measureElement = (node) => {
                node && this._measureElement(node, void 0);
              }),
              (this.getVirtualItems = memo(
                () => [this.getIndexes(), this.getMeasurements()],
                (indexes, measurements) => {
                  const virtualItems = [];
                  for (let k = 0, len = indexes.length; k < len; k++) {
                    const measurement = measurements[indexes[k]];
                    virtualItems.push(measurement);
                  }
                  return virtualItems;
                },
                { key: !1, debug: () => this.options.debug },
              )),
              (this.getVirtualItemForOffset = (offset) => {
                const measurements = this.getMeasurements();
                return notUndefined(
                  measurements[
                    findNearestBinarySearch(
                      0,
                      measurements.length - 1,
                      (index) => notUndefined(measurements[index]).start,
                      offset,
                    )
                  ],
                );
              }),
              (this.getOffsetForAlignment = (toOffset, align) => {
                const size = this.getSize();
                'auto' === align &&
                  (align =
                    toOffset <= this.scrollOffset
                      ? 'start'
                      : toOffset >= this.scrollOffset + size
                        ? 'end'
                        : 'start'),
                  'start' === align ||
                    ('end' === align
                      ? (toOffset -= size)
                      : 'center' === align && (toOffset -= size / 2));
                const scrollSizeProp = this.options.horizontal ? 'scrollWidth' : 'scrollHeight',
                  maxOffset =
                    (this.scrollElement
                      ? 'document' in this.scrollElement
                        ? this.scrollElement.document.documentElement[scrollSizeProp]
                        : this.scrollElement[scrollSizeProp]
                      : 0) - this.getSize();
                return Math.max(Math.min(maxOffset, toOffset), 0);
              }),
              (this.getOffsetForIndex = (index, align = 'auto') => {
                index = Math.max(0, Math.min(index, this.options.count - 1));
                const measurement = notUndefined(this.getMeasurements()[index]);
                if ('auto' === align)
                  if (
                    measurement.end >=
                    this.scrollOffset + this.getSize() - this.options.scrollPaddingEnd
                  )
                    align = 'end';
                  else {
                    if (!(measurement.start <= this.scrollOffset + this.options.scrollPaddingStart))
                      return [this.scrollOffset, align];
                    align = 'start';
                  }
                const toOffset =
                  'end' === align
                    ? measurement.end + this.options.scrollPaddingEnd
                    : measurement.start - this.options.scrollPaddingStart;
                return [this.getOffsetForAlignment(toOffset, align), align];
              }),
              (this.isDynamicMode = () => this.measureElementCache.size > 0),
              (this.cancelScrollToIndex = () => {
                null !== this.scrollToIndexTimeoutId &&
                  (clearTimeout(this.scrollToIndexTimeoutId), (this.scrollToIndexTimeoutId = null));
              }),
              (this.scrollToOffset = (toOffset, { align = 'start', behavior } = {}) => {
                this.cancelScrollToIndex(),
                  'smooth' === behavior &&
                    this.isDynamicMode() &&
                    console.warn(
                      'The `smooth` scroll behavior is not fully supported with dynamic size.',
                    ),
                  this._scrollToOffset(this.getOffsetForAlignment(toOffset, align), {
                    adjustments: void 0,
                    behavior,
                  });
              }),
              (this.scrollToIndex = (index, { align: initialAlign = 'auto', behavior } = {}) => {
                (index = Math.max(0, Math.min(index, this.options.count - 1))),
                  this.cancelScrollToIndex(),
                  'smooth' === behavior &&
                    this.isDynamicMode() &&
                    console.warn(
                      'The `smooth` scroll behavior is not fully supported with dynamic size.',
                    );
                const [toOffset, align] = this.getOffsetForIndex(index, initialAlign);
                this._scrollToOffset(toOffset, { adjustments: void 0, behavior }),
                  'smooth' !== behavior &&
                    this.isDynamicMode() &&
                    (this.scrollToIndexTimeoutId = setTimeout(() => {
                      this.scrollToIndexTimeoutId = null;
                      if (this.measureElementCache.has(this.options.getItemKey(index))) {
                        const [toOffset2] = this.getOffsetForIndex(index, align);
                        (a = toOffset2),
                          (b = this.scrollOffset),
                          Math.abs(a - b) < 1 || this.scrollToIndex(index, { align, behavior });
                      } else this.scrollToIndex(index, { align, behavior });
                      var a, b;
                    }));
              }),
              (this.scrollBy = (delta, { behavior } = {}) => {
                this.cancelScrollToIndex(),
                  'smooth' === behavior &&
                    this.isDynamicMode() &&
                    console.warn(
                      'The `smooth` scroll behavior is not fully supported with dynamic size.',
                    ),
                  this._scrollToOffset(this.scrollOffset + delta, {
                    adjustments: void 0,
                    behavior,
                  });
              }),
              (this.getTotalSize = () => {
                var _a;
                const measurements = this.getMeasurements();
                let end;
                return (
                  (end =
                    0 === measurements.length
                      ? this.options.paddingStart
                      : 1 === this.options.lanes
                        ? ((null == (_a = measurements[measurements.length - 1])
                            ? void 0
                            : _a.end) ?? 0)
                        : Math.max(...measurements.slice(-this.options.lanes).map((m) => m.end))),
                  end - this.options.scrollMargin + this.options.paddingEnd
                );
              }),
              (this._scrollToOffset = (offset, { adjustments, behavior }) => {
                this.options.scrollToFn(offset, { behavior, adjustments }, this);
              }),
              (this.measure = () => {
                (this.itemSizeCache = new Map()), this.notify(!1);
              }),
              this.setOptions(opts),
              (this.scrollRect = this.options.initialRect),
              (this.scrollOffset = this.options.initialOffset),
              (this.measurementsCache = this.options.initialMeasurementsCache),
              this.measurementsCache.forEach((item) => {
                this.itemSizeCache.set(item.key, item.size);
              }),
              this.maybeNotify();
          }
        }
        const findNearestBinarySearch = (low, high, getCurrentValue, value) => {
          for (; low <= high; ) {
            const middle = ((low + high) / 2) | 0,
              currentValue = getCurrentValue(middle);
            if (currentValue < value) low = middle + 1;
            else {
              if (!(currentValue > value)) return middle;
              high = middle - 1;
            }
          }
          return low > 0 ? low - 1 : 0;
        };
        const useIsomorphicLayoutEffect =
          'undefined' != typeof document ? react.useLayoutEffect : react.useEffect;
        function useVirtualizer(options) {
          return (function useVirtualizerBase(options) {
            const rerender = react.useReducer(() => ({}), {})[1],
              resolvedOptions = {
                ...options,
                onChange: (instance2, sync) => {
                  var _a;
                  sync ? (0, react_dom.flushSync)(rerender) : rerender(),
                    null == (_a = options.onChange) || _a.call(options, instance2, sync);
                },
              },
              [instance] = react.useState(() => new Virtualizer(resolvedOptions));
            return (
              instance.setOptions(resolvedOptions),
              react.useEffect(() => instance._didMount(), []),
              useIsomorphicLayoutEffect(() => instance._willUpdate()),
              instance
            );
          })({ observeElementRect, observeElementOffset, scrollToFn: elementScroll, ...options });
        }
        var useFormField = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/useFormField.js',
        );
        function useDebounce(callback, delay = 50) {
          const timeoutRef = (0, react.useRef)(null);
          (0, react.useEffect)(
            () => () => {
              timeoutRef.current && clearTimeout(timeoutRef.current);
            },
            [],
          );
          return (...args) => {
            timeoutRef.current && clearTimeout(timeoutRef.current),
              (timeoutRef.current = setTimeout(() => {
                callback(...args);
              }, delay));
          };
        }
        var getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
        const ComboboxContext = (0, react.createContext)(void 0);
        var useId = __webpack_require__(
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
        const Checkmark = (0, react.forwardRef)((_a, ref) => {
            var { title, titleId: _titleId } = _a,
              props = __rest(_a, ['title', 'titleId']);
            let titleId = (0, useId.B)();
            return (
              (titleId = title ? _titleId || 'title-' + titleId : void 0),
              react.createElement(
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
                title ? react.createElement('title', { id: titleId }, title) : null,
                react.createElement('path', {
                  fillRule: 'evenodd',
                  clipRule: 'evenodd',
                  d: 'M18.998 6.94a.75.75 0 0 1 .063 1.058l-8 9a.75.75 0 0 1-1.091.032l-5-5a.75.75 0 1 1 1.06-1.06l4.438 4.437 7.471-8.405A.75.75 0 0 1 19 6.939Z',
                  fill: 'currentColor',
                }),
              )
            );
          }),
          SelectedIcon = ({ multiple, selected }) =>
            (0, jsx_runtime.jsx)('div', {
              className: (0, lite.$)(
                multiple && 'fds-combobox__option__icon-wrapper',
                selected && 'fds-combobox__option__icon-wrapper--selected',
              ),
              children:
                selected &&
                (0, jsx_runtime.jsx)(Checkmark, {
                  className: 'fds-combobox__option__icon-wrapper__icon',
                  'aria-hidden': !0,
                }),
            });
        SelectedIcon.displayName = 'SelectedIcon';
        const ComboboxOptionDescription = (0, react.forwardRef)(
          ({ children, className, ...rest }, ref) =>
            (0, jsx_runtime.jsx)('span', {
              className: (0, lite.$)('fds-combobox__option__description', className),
              ref,
              ...rest,
              children,
            }),
        );
        ComboboxOptionDescription.displayName = 'ComboboxOptionDescription';
        var ComboboxOptionDescription$1 = ComboboxOptionDescription;
        const ComboboxIdContext = (0, react.createContext)({ activeIndex: 0 }),
          ComboboxIdReducer = (state, action) =>
            'SET_ACTIVE_INDEX' === action.type ? { ...state, activeIndex: action.payload } : state,
          ComboboxIdDispatch = (0, react.createContext)(() => {
            throw new Error('ComboboxIdDispatch must be used within a provider');
          }),
          ComboboxIdProvider = ({ children }) => {
            const [state, dispatch] = (0, react.useReducer)(ComboboxIdReducer, { activeIndex: 0 });
            return (0, jsx_runtime.jsx)(ComboboxIdContext.Provider, {
              value: state,
              children: (0, jsx_runtime.jsx)(ComboboxIdDispatch.Provider, {
                value: dispatch,
                children,
              }),
            });
          };
        function useComboboxIdDispatch() {
          return (0, react.useContext)(ComboboxIdDispatch);
        }
        function useComboboxId() {
          return (0, react.useContext)(ComboboxIdContext);
        }
        var objectUtils = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/objectUtils.js',
          ),
          Label = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
          );
        const ComboboxOption = (0, react.memo)(
          (0, react.forwardRef)(
            ({ value, description, children, className, ...rest }, forwardedRef) => {
              const labelId = (0, react.useId)(),
                { id, ref, selected, active, onOptionClick } = (function useComboboxOption({
                  id,
                  ref,
                  value,
                }) {
                  const generatedId = (0, react.useId)(),
                    newId = id || generatedId,
                    context = (0, react.useContext)(ComboboxContext),
                    { activeIndex } = useComboboxId(),
                    dispatch = useComboboxIdDispatch();
                  if (!context) throw new Error('ComboboxOption must be used within a Combobox');
                  const { selectedOptions, onOptionClick, listRef, customIds, filteredOptions } =
                      context,
                    index = (0, react.useMemo)(
                      () => filteredOptions.indexOf(prefix(String(value))) + customIds.length,
                      [customIds.length, filteredOptions, value],
                    ),
                    combinedRef = (0, floating_ui_react.SV)([
                      (node) => {
                        listRef.current[index] = node;
                      },
                      ref,
                    ]);
                  if (-1 === index)
                    throw new Error('Internal error: ComboboxOption did not find index');
                  const selected = selectedOptions[prefix(value)],
                    active = activeIndex === index;
                  (0, react.useEffect)(() => {
                    active && dispatch?.({ type: 'SET_ACTIVE_INDEX', payload: index });
                  }, [generatedId, id, dispatch, active, index]);
                  const onOptionClickDebounced = useDebounce(() => onOptionClick(value), 50);
                  return {
                    id: newId,
                    ref: combinedRef,
                    selected,
                    active,
                    onOptionClick: onOptionClickDebounced,
                  };
                })({ id: rest.id, ref: forwardedRef, value }),
                context = (0, react.useContext)(ComboboxContext);
              if (!context) throw new Error('ComboboxOption must be used within a Combobox');
              const { size, multiple, getItemProps } = context,
                props = getItemProps();
              return (0, jsx_runtime.jsxs)('button', {
                ref,
                id,
                role: 'option',
                type: 'button',
                'aria-selected': !!selected,
                'aria-labelledby': labelId,
                tabIndex: -1,
                onClick: (e) => {
                  onOptionClick(), rest.onClick?.(e);
                },
                className: (0, lite.$)(
                  'fds-combobox__option',
                  active && 'fds-combobox__option--active',
                  multiple && 'fds-combobox__option--multiple',
                  className,
                ),
                ...(0, objectUtils.c)(['displayValue'], rest),
                ...(0, objectUtils.c)(['onClick', 'onPointerLeave'], props),
                children: [
                  (0, jsx_runtime.jsx)(Label.J, {
                    asChild: !0,
                    size,
                    children: (0, jsx_runtime.jsx)('span', {
                      children: (0, jsx_runtime.jsx)(SelectedIcon, {
                        multiple,
                        selected: !!selected,
                      }),
                    }),
                  }),
                  (0, jsx_runtime.jsxs)(Label.J, {
                    className: 'fds-combobox__option__label',
                    size,
                    id: labelId,
                    children: [
                      children,
                      description &&
                        (0, jsx_runtime.jsx)(ComboboxOptionDescription$1, {
                          children: description,
                        }),
                    ],
                  }),
                ],
              });
            },
          ),
        );
        ComboboxOption.displayName = 'ComboboxOption';
        var dist = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
        );
        var ComboboxCustom$1 = (0, react.forwardRef)(
          ({ asChild, interactive, id, className, ...rest }, ref) => {
            if (interactive && !id)
              throw new Error('If ComboboxCustom is interactive, it must have an id');
            const Component = asChild ? dist.D : 'div',
              randomId = (0, react.useId)(),
              { activeIndex } = useComboboxId(),
              context = (0, react.useContext)(ComboboxContext);
            if (!context) throw new Error('ComboboxCustom must be used within a Combobox');
            const { customIds, listRef, getItemProps } = context,
              index = (0, react.useMemo)(() => (id && customIds.indexOf(id)) || 0, [id, customIds]),
              combinedRef = (0, floating_ui_react.SV)([
                (node) => {
                  listRef.current[index] = node;
                },
                ref,
              ]);
            return (0, jsx_runtime.jsx)(Component, {
              ref: combinedRef,
              tabIndex: -1,
              className: (0, lite.$)('fds-combobox__custom', className),
              id: id || randomId,
              role: 'option',
              'aria-selected': activeIndex === index,
              'data-active': activeIndex === index,
              ...(0, objectUtils.c)(['interactive'], rest),
              ...(0, objectUtils.c)(['onClick', 'onPointerLeave'], getItemProps()),
            });
          },
        );
        function isInteractiveComboboxCustom(child) {
          return (
            (function isComboboxCustom(child) {
              return (0, react.isValidElement)(child) && child.type === ComboboxCustom$1;
            })(child) && !0 === child.props.interactive
          );
        }
        const prefix = (value) => 'internal-option-' + value,
          removePrefix = (value) => value.slice(16);
        function useCombobox({
          children,
          inputValue,
          multiple,
          filter = (inputValue, option) =>
            option.label.toLowerCase().startsWith(inputValue.toLowerCase()),
          initialValue,
        }) {
          const { optionsChildren, customIds, restChildren, interactiveChildren } = (0,
            react.useMemo)(
              () =>
                react.Children.toArray(children).reduce(
                  (acc, child) => {
                    if (
                      (function isComboboxOption(child) {
                        return (0, react.isValidElement)(child) && child.type === ComboboxOption;
                      })(child)
                    )
                      acc.optionsChildren.push(child);
                    else if ((acc.restChildren.push(child), isInteractiveComboboxCustom(child))) {
                      const childElement = child;
                      if ((acc.interactiveChildren.push(childElement), !childElement.props.id))
                        throw new Error('If ComboboxCustom is interactive, it must have an id');
                      acc.customIds.push(childElement.props.id);
                    }
                    return acc;
                  },
                  { optionsChildren: [], customIds: [], restChildren: [], interactiveChildren: [] },
                ),
              [children],
            ),
            options = (0, react.useMemo)(() => {
              const allOptions = {};
              return (
                optionsChildren.map((child) => {
                  const props = child.props;
                  let label = props.displayValue || '';
                  if (!props.displayValue) {
                    let childrenLabel = '';
                    react.Children.forEach(props.children, (child) => {
                      if ('string' != typeof child)
                        throw new Error(
                          'If ComboboxOption is not a string, it must have a displayValue prop',
                        );
                      childrenLabel += child;
                    }),
                      (label = childrenLabel);
                  }
                  allOptions[prefix(String(props.value))] = {
                    value: String(props.value),
                    label,
                    displayValue: props.displayValue,
                    description: props.description,
                  };
                }),
                allOptions
              );
            }, [optionsChildren]),
            preSelectedOptions = (0, react.useMemo)(
              () =>
                (initialValue?.map((key) => prefix(key)) || []).reduce((acc, value) => {
                  const option = options[value];
                  return ((option) => !!option)(option) && (acc[value] = option), acc;
                }, {}),
              [initialValue, options],
            ),
            [selectedOptions, setSelectedOptions] = (0, react.useState)(preSelectedOptions),
            { filteredOptions, filteredOptionsChildren } = (0, react.useMemo)(() => {
              const filteredOptions = [],
                filteredOptionsChildren = Object.keys(options).map((option, index) =>
                  multiple || 1 !== Object.keys(selectedOptions).length
                    ? (multiple && selectedOptions[option]) || filter(inputValue, options[option])
                      ? (filteredOptions.push(option), optionsChildren[index])
                      : void 0
                    : (filteredOptions.push(option), optionsChildren[index]),
                );
              return { filteredOptions, filteredOptionsChildren };
            }, [inputValue, multiple, options, optionsChildren, selectedOptions]);
          return {
            filteredOptionsChildren,
            filteredOptions,
            restChildren,
            options,
            customIds,
            selectedOptions,
            interactiveChildren,
            setSelectedOptions,
          };
        }
        var ChevronUp = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronUp.js',
          ),
          ChevronDown = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronDown.js',
          ),
          XMark_rest = function (s, e) {
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
        const XMark = (0, react.forwardRef)((_a, ref) => {
            var { title, titleId: _titleId } = _a,
              props = XMark_rest(_a, ['title', 'titleId']);
            let titleId = (0, useId.B)();
            return (
              (titleId = title ? _titleId || 'title-' + titleId : void 0),
              react.createElement(
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
                title ? react.createElement('title', { id: titleId }, title) : null,
                react.createElement('path', {
                  d: 'M6.53 5.47a.75.75 0 0 0-1.06 1.06L10.94 12l-5.47 5.47a.75.75 0 1 0 1.06 1.06L12 13.06l5.47 5.47a.75.75 0 1 0 1.06-1.06L13.06 12l5.47-5.47a.75.75 0 0 0-1.06-1.06L12 10.94 6.53 5.47Z',
                  fill: 'currentColor',
                }),
              )
            );
          }),
          ChipGroupContext = (0, react.createContext)(null);
        (0, react.forwardRef)(({ children, className, ...rest }, ref) => {
          const size = (0, getSize.Y)(rest.size || 'md');
          return (0, jsx_runtime.jsx)('ul', {
            ref,
            className: (0, lite.$)('fds-chip--group-container', `fds-chip--${size}`, className),
            ...rest,
            children: (0, jsx_runtime.jsx)(ChipGroupContext.Provider, {
              value: { size },
              children: react.Children.toArray(children).map((child, index) =>
                (0, react.isValidElement)(child)
                  ? (0, jsx_runtime.jsx)('li', { children: child }, `chip-${index}`)
                  : null,
              ),
            }),
          });
        }).displayName = 'ChipGroup';
        var Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        );
        const RemovableChip = (0, react.forwardRef)(({ children, className, ...rest }, ref) => {
          const group = (0, react.useContext)(ChipGroupContext),
            size = (0, getSize.Y)(rest.size || 'md');
          return (0, jsx_runtime.jsx)('button', {
            type: 'button',
            ref,
            className: (0, lite.$)(
              'fds-focus',
              'fds-chip--button',
              'fds-chip--removable',
              `fds-chip--${group?.size || size}`,
              className,
            ),
            ...rest,
            children: (0, jsx_runtime.jsx)(Paragraph.f, {
              asChild: !0,
              size: group?.size || size,
              variant: 'short',
              children: (0, jsx_runtime.jsxs)('span', {
                className: 'fds-chip__label',
                children: [
                  (0, jsx_runtime.jsx)('span', { children }),
                  (0, jsx_runtime.jsx)('span', {
                    className: 'fds-chip__x-mark',
                    'aria-hidden': !0,
                    children: (0, jsx_runtime.jsx)(XMark, { className: 'fds-chip__icon' }),
                  }),
                ],
              }),
            }),
          });
        });
        RemovableChip.displayName = 'ChipRemovable';
        const ComboboxChips = () => {
          const context = (0, react.useContext)(ComboboxContext);
          if (!context) throw new Error('ComboboxContext is missing');
          const {
            size,
            readOnly,
            disabled,
            selectedOptions,
            chipSrLabel,
            handleSelectOption,
            inputRef,
          } = context;
          return (0, jsx_runtime.jsx)(jsx_runtime.Fragment, {
            children: Object.keys(selectedOptions).map((value) =>
              (0, jsx_runtime.jsx)(
                RemovableChip,
                {
                  size,
                  disabled,
                  onKeyDown: (e) => {
                    readOnly ||
                      disabled ||
                      ('Enter' === e.key &&
                        (e.stopPropagation(),
                        handleSelectOption({ option: selectedOptions[value], remove: !0 }),
                        inputRef.current?.focus()));
                  },
                  onClick: () => {
                    readOnly ||
                      disabled ||
                      handleSelectOption({ option: selectedOptions[value], remove: !0 });
                  },
                  'aria-label': chipSrLabel(selectedOptions[value]),
                  children: selectedOptions[value].label,
                },
                value,
              ),
            ),
          });
        };
        ComboboxChips.displayName = 'ComboboxChips';
        var ComboboxChips$1 = ComboboxChips;
        const ComboboxClearButton = () => {
          const context = (0, react.useContext)(ComboboxContext);
          if (!context) throw new Error('ComboboxContext is missing');
          const { readOnly, disabled, clearButtonLabel, handleSelectOption } = context;
          return (0, jsx_runtime.jsx)('button', {
            disabled,
            className: (0, lite.$)('fds-combobox__clear-button', 'fds-focus'),
            onClick: () => {
              readOnly || disabled || handleSelectOption({ option: null, clear: !0 });
            },
            onKeyDown: (e) => {
              readOnly ||
                disabled ||
                ('Enter' === e.key &&
                  (e.stopPropagation(), handleSelectOption({ option: null, clear: !0 })));
            },
            type: 'button',
            'aria-label': clearButtonLabel,
            children: (0, jsx_runtime.jsx)(XMark, { fontSize: '1.5em', title: 'Clear selection' }),
          });
        };
        ComboboxClearButton.displayName = 'ComboboxClearButton';
        var ComboboxClearButton$1 = ComboboxClearButton;
        const Box = (0, react.forwardRef)(
          (
            {
              shadow,
              borderColor,
              borderRadius,
              background = 'default',
              children,
              asChild = !1,
              className,
              ...rest
            },
            ref,
          ) => {
            const Component = asChild ? dist.D : 'div',
              shadowSize = shadow && (0, getSize.Y)(shadow),
              borderRadiusSize = borderRadius && (0, getSize.Y)(borderRadius);
            return (0, jsx_runtime.jsx)(Component, {
              ref,
              className: (0, lite.$)(
                shadowSize && `fds-box--${shadowSize}-shadow`,
                borderColor && `fds-box--${borderColor}-border-color`,
                borderRadiusSize && `fds-box--${borderRadiusSize}-border-radius`,
                `fds-box--${background}-background`,
                className,
              ),
              ...rest,
              children,
            });
          },
        );
        Box.displayName = 'Box';
        const ComboboxInput = ({
          hideClearButton,
          listId,
          error,
          hideChips,
          handleKeyDown,
          ...rest
        }) => {
          const context = (0, react.useContext)(ComboboxContext),
            idDispatch = useComboboxIdDispatch();
          if (!context) throw new Error('ComboboxContext is missing');
          const setActiveIndex = (id) => {
              idDispatch?.({ type: 'SET_ACTIVE_INDEX', payload: id });
            },
            {
              forwareddRef,
              readOnly,
              disabled,
              open,
              inputRef,
              refs,
              inputValue,
              multiple,
              selectedOptions,
              formFieldProps,
              htmlSize,
              options,
              setOpen,
              getReferenceProps,
              setInputValue,
              handleSelectOption,
            } = context,
            mergedRefs = (0, floating_ui_react.SV)([forwareddRef, inputRef]),
            showClearButton =
              multiple && !hideClearButton && Object.keys(selectedOptions).length > 0,
            props = getReferenceProps({
              ref: refs?.setReference,
              role: null,
              'aria-controls': null,
              'aria-expanded': null,
              'aria-haspopup': null,
              onClick() {
                disabled || readOnly || (setOpen(!0), setActiveIndex(0), inputRef.current?.focus());
              },
              onKeyDown: handleKeyDown,
              onKeyPress(event) {
                'Enter' === event.key && event.preventDefault();
              },
            });
          return (0, jsx_runtime.jsxs)(Box, {
            ...props,
            'aria-disabled': disabled,
            className: (0, lite.$)(
              'fds-textfield__input',
              'fds-combobox__input__wrapper',
              readOnly && 'fds-combobox--readonly',
              error && 'fds-combobox--error',
            ),
            children: [
              (0, jsx_runtime.jsxs)('div', {
                className: 'fds-combobox__chip-and-input',
                children: [
                  multiple && !hideChips && (0, jsx_runtime.jsx)(ComboboxChips$1, {}),
                  (0, jsx_runtime.jsx)('input', {
                    ref: mergedRefs,
                    'aria-activedescendant': props['aria-activedescendant'],
                    readOnly,
                    'aria-autocomplete': 'list',
                    role: 'combobox',
                    'aria-expanded': open,
                    'aria-controls': listId,
                    autoComplete: 'off',
                    size: htmlSize,
                    value: inputValue,
                    ...(0, objectUtils.c)(['style', 'className'], rest),
                    ...formFieldProps.inputProps,
                    className: 'fds-combobox__input',
                    onChange: (e) => {
                      ((event) => {
                        const value = event.target.value;
                        setInputValue(value), setActiveIndex(0);
                        const option = options[prefix(value.toLowerCase())];
                        option &&
                          (selectedOptions[prefix(option.value)] || handleSelectOption({ option }));
                      })(e),
                        !open && setOpen(!0),
                        rest.onChange && rest.onChange(e);
                    },
                  }),
                ],
              }),
              showClearButton && (0, jsx_runtime.jsx)(ComboboxClearButton$1, {}),
              (0, jsx_runtime.jsx)('div', {
                className: 'fds-combobox__arrow',
                children: open
                  ? (0, jsx_runtime.jsx)(ChevronUp.A, { title: 'arrow up', fontSize: '1.5em' })
                  : (0, jsx_runtime.jsx)(ChevronDown.A, { title: 'arrow down', fontSize: '1.5em' }),
              }),
            ],
          });
        };
        ComboboxInput.displayName = 'ComboboxInput';
        var ComboboxInput$1 = ComboboxInput,
          PadlockLockedFill = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js',
          );
        const ComboboxLabel = ({ label, description, hideLabel, size, readOnly, formFieldProps }) =>
          (0, jsx_runtime.jsxs)(jsx_runtime.Fragment, {
            children: [
              label &&
                (0, jsx_runtime.jsxs)(Label.J, {
                  size,
                  htmlFor: formFieldProps.inputProps.id,
                  className: (0, lite.$)('fds-combobox__label', hideLabel && 'fds-sr-only'),
                  children: [
                    readOnly &&
                      (0, jsx_runtime.jsx)(PadlockLockedFill.A, {
                        'aria-hidden': !0,
                        className: 'fds-combobox__readonly__icon',
                      }),
                    label,
                  ],
                }),
              description &&
                (0, jsx_runtime.jsx)(Paragraph.f, {
                  asChild: !0,
                  size,
                  children: (0, jsx_runtime.jsx)('div', {
                    id: formFieldProps.descriptionId,
                    className: (0, lite.$)('fds-combobox__description', hideLabel && 'fds-sr-only'),
                    children: description,
                  }),
                }),
            ],
          });
        ComboboxLabel.displayName = 'ComboboxLabel';
        var ComboboxLabel$1 = ComboboxLabel,
          ErrorMessage = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
          );
        const ComboboxError = ({ size, error, formFieldProps }) =>
          (0, jsx_runtime.jsx)('div', {
            className: 'fds-combobox__error-message',
            id: formFieldProps.errorId,
            'aria-live': 'polite',
            'aria-relevant': 'additions removals',
            children: error && (0, jsx_runtime.jsx)(ErrorMessage.K, { size, children: error }),
          });
        ComboboxError.displayName = 'ComboboxError';
        var ComboboxError$1 = ComboboxError;
        const ComboboxNative = ({ selectedOptions, multiple, name }) => {
          const VALUE = Object.keys(selectedOptions).map((key) => removePrefix(key));
          return (0, jsx_runtime.jsx)('select', {
            name,
            multiple,
            style: { display: 'none' },
            value: multiple ? VALUE : VALUE[0],
            onChange: () => {},
            children: VALUE.map((value) => (0, jsx_runtime.jsx)('option', { value }, value)),
          });
        };
        ComboboxNative.displayName = 'ComboboxNative';
        var ComboboxNative$1 = ComboboxNative,
          floating_ui_dom = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/dom/dist/floating-ui.dom.js',
          ),
          floating_ui_core = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/core/dist/floating-ui.core.js',
          );
        var Spinner = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Spinner/Spinner.js',
        );
        const ComboboxComponent = (0, react.forwardRef)(
            (
              {
                value,
                initialValue = [],
                onValueChange,
                label,
                hideLabel = !1,
                description,
                multiple = !1,
                disabled = !1,
                readOnly = !1,
                hideChips = !1,
                clearButtonLabel = 'Fjern alt',
                hideClearButton = !1,
                error,
                errorId,
                id,
                name,
                portal = !0,
                htmlSize = 0,
                virtual = !1,
                children,
                style,
                loading,
                loadingLabel = 'Laster...',
                filter,
                chipSrLabel = (option) => 'Slett ' + option.label,
                className,
                ...rest
              },
              forwareddRef,
            ) => {
              const size = (0, getSize.Y)(rest.size || 'md'),
                inputRef = (0, react.useRef)(null),
                portalRef = (0, react.useRef)(null),
                listRef = (0, react.useRef)([]),
                listId = (0, react.useId)(),
                [inputValue, setInputValue] = (0, react.useState)(rest.inputValue || ''),
                {
                  selectedOptions,
                  options,
                  restChildren,
                  interactiveChildren,
                  customIds,
                  filteredOptionsChildren,
                  filteredOptions,
                  setSelectedOptions,
                } = useCombobox({ children, inputValue, filter, multiple, initialValue }),
                {
                  open,
                  setOpen,
                  refs,
                  floatingStyles,
                  context,
                  getReferenceProps,
                  getFloatingProps,
                  getItemProps,
                } = (({ listRef }) => {
                  const [open, setOpen] = (0, react.useState)(!1),
                    { activeIndex } = useComboboxId(),
                    dispatch = useComboboxIdDispatch(),
                    { refs, floatingStyles, context } = (0, floating_ui_react.we)({
                      open,
                      onOpenChange: (newOpen) => {
                        newOpen || dispatch?.({ type: 'SET_ACTIVE_INDEX', payload: 0 }),
                          (0, react_dom.flushSync)(() => {
                            refs.floating.current &&
                              !newOpen &&
                              (refs.floating.current.scrollTop = 0),
                              setTimeout(() => {
                                setOpen(newOpen);
                              }, 1);
                          });
                      },
                      whileElementsMounted: (reference, floating, update) => (
                        (0, floating_ui_dom.ll)(reference, floating, update),
                        () => {
                          floating.scrollTop = 0;
                        }
                      ),
                      middleware: [
                        (0, floating_ui_dom.UU)({ padding: 10 }),
                        (0, floating_ui_dom.Ej)({
                          apply({ rects, elements }) {
                            requestAnimationFrame(() => {
                              Object.assign(elements.floating.style, {
                                width: `calc(${rects.reference.width}px - calc(var(--fds-spacing-2) * 2))`,
                                maxHeight: '200px',
                              });
                            });
                          },
                        }),
                        (0, floating_ui_core.cY)(10),
                      ],
                    }),
                    role = (0, floating_ui_react.It)(context, { role: 'listbox' }),
                    dismiss = (0, floating_ui_react.s9)(context),
                    listNav = (0, floating_ui_react.C1)(context, {
                      listRef,
                      activeIndex,
                      virtual: !0,
                      scrollItemIntoView: !0,
                      enabled: open,
                      focusItemOnHover: !0,
                      onNavigate: (index) => {
                        dispatch?.({ type: 'SET_ACTIVE_INDEX', payload: index || 0 });
                      },
                    }),
                    { getReferenceProps, getFloatingProps, getItemProps } = (0,
                    floating_ui_react.bv)([role, dismiss, listNav]);
                  return {
                    open,
                    setOpen,
                    activeIndex,
                    refs,
                    floatingStyles,
                    context,
                    getReferenceProps,
                    getFloatingProps,
                    getItemProps,
                  };
                })({ listRef }),
                formFieldProps = (0, useFormField.W)(
                  { disabled, readOnly, error, errorId, size, description, id },
                  'combobox',
                );
              (0, react.useEffect)(() => {
                if (value && value.length > 0 && !multiple) {
                  const option = options[prefix(value[0])];
                  setInputValue(option?.label || '');
                }
              }, [multiple, value, options]),
                (0, react.useEffect)(() => {
                  if (value && Object.keys(options).length >= 0) {
                    const updatedSelectedOptions = value.map((option) => options[prefix(option)]);
                    setSelectedOptions(
                      updatedSelectedOptions.reduce(
                        (acc, value) => ((acc[prefix(value.value)] = value), acc),
                        {},
                      ),
                    );
                  }
                }, [multiple, value, options, setSelectedOptions]);
              const debouncedHandleSelectOption = useDebounce((args) => {
                  const { option, clear, remove } = args;
                  if (clear)
                    return setSelectedOptions({}), setInputValue(''), void onValueChange?.([]);
                  if (!option) return;
                  if (remove) {
                    const newSelectedOptions = { ...selectedOptions };
                    return (
                      delete newSelectedOptions[prefix(option.value)],
                      setSelectedOptions(newSelectedOptions),
                      void onValueChange?.(
                        Object.keys(newSelectedOptions).map((key) => removePrefix(key)),
                      )
                    );
                  }
                  const newSelectedOptions = { ...selectedOptions };
                  multiple
                    ? (newSelectedOptions[prefix(option.value)]
                        ? delete newSelectedOptions[prefix(option.value)]
                        : (newSelectedOptions[prefix(option.value)] = option),
                      setInputValue(''),
                      inputRef.current?.focus())
                    : (Object.keys(newSelectedOptions).forEach((key) => {
                        delete newSelectedOptions[key];
                      }),
                      (newSelectedOptions[prefix(option.value)] = option),
                      setInputValue(option?.label || ''),
                      setTimeout(() => {
                        inputRef.current?.setSelectionRange(
                          option?.label?.length || 0,
                          option?.label?.length || 0,
                        );
                      }, 0)),
                    setSelectedOptions(newSelectedOptions),
                    onValueChange?.(
                      Object.keys(newSelectedOptions).map((key) => removePrefix(key)),
                    ),
                    !multiple && setOpen(!1),
                    refs.domReference.current?.focus();
                }, 50),
                handleKeyDown = (({
                  readOnly,
                  disabled,
                  interactiveChildren,
                  filteredOptions,
                  inputValue,
                  selectedOptions,
                  multiple,
                  open,
                  options,
                  setOpen,
                  handleSelectOption,
                }) => {
                  const { activeIndex } = useComboboxId();
                  return useDebounce((event) => {
                    if (!readOnly && !disabled && event)
                      switch (event.key) {
                        case 'ArrowDown':
                          if ((event.preventDefault(), open)) break;
                          setOpen(!0);
                          break;
                        case 'ArrowUp':
                          if ((event.preventDefault(), 0 !== activeIndex)) break;
                          setOpen(!1);
                          break;
                        case 'Enter':
                          if ((event.preventDefault(), !open)) break;
                          if (activeIndex <= interactiveChildren.length - 1) {
                            const selectedComponent = interactiveChildren[activeIndex];
                            if (selectedComponent.props.onSelect)
                              return void selectedComponent?.props.onSelect();
                          }
                          const valueIndex = activeIndex - interactiveChildren.length,
                            option = filteredOptions[valueIndex];
                          handleSelectOption({ option: options[option] });
                          break;
                        case 'Backspace':
                          if (!multiple) {
                            const lastOption = Object.keys(selectedOptions).pop();
                            lastOption &&
                              handleSelectOption({
                                option: selectedOptions[lastOption],
                                remove: !0,
                              });
                            break;
                          }
                          if ('' === inputValue && multiple) {
                            const lastOption = Object.keys(selectedOptions).pop();
                            lastOption &&
                              handleSelectOption({
                                option: selectedOptions[lastOption],
                                remove: !0,
                              });
                          }
                      }
                  }, 20);
                })({
                  filteredOptions,
                  selectedOptions,
                  readOnly: formFieldProps.readOnly || !1,
                  disabled,
                  multiple,
                  inputValue,
                  options,
                  open,
                  interactiveChildren,
                  setOpen,
                  setInputValue,
                  handleSelectOption: debouncedHandleSelectOption,
                }),
                rowVirtualizer = useVirtualizer({
                  count: Object.keys(filteredOptionsChildren).length,
                  getScrollElement: () => (virtual ? refs.floating.current : null),
                  estimateSize: () => 70,
                  measureElement: (elem) => elem.getBoundingClientRect().height,
                  overscan: 7,
                });
              return (0, jsx_runtime.jsxs)(ComboboxContext.Provider, {
                value: {
                  size,
                  options,
                  selectedOptions,
                  multiple,
                  disabled,
                  readOnly,
                  open,
                  inputRef,
                  refs,
                  inputValue,
                  formFieldProps,
                  htmlSize,
                  clearButtonLabel,
                  customIds,
                  filteredOptions,
                  setInputValue,
                  setOpen,
                  getReferenceProps,
                  getItemProps,
                  onOptionClick: (value) => {
                    if (readOnly) return;
                    if (disabled) return;
                    const option = options[prefix(value)];
                    debouncedHandleSelectOption({ option });
                  },
                  handleSelectOption: debouncedHandleSelectOption,
                  chipSrLabel,
                  listRef,
                  forwareddRef,
                },
                children: [
                  (0, jsx_runtime.jsxs)(Box, {
                    className: (0, lite.$)(
                      'fds-combobox',
                      `fds-combobox--${size}`,
                      disabled && 'fds-combobox__disabled',
                      className,
                    ),
                    style,
                    ref: portalRef,
                    children: [
                      name &&
                        (0, jsx_runtime.jsx)(ComboboxNative$1, { name, selectedOptions, multiple }),
                      (0, jsx_runtime.jsx)(ComboboxLabel$1, {
                        label,
                        description,
                        size,
                        readOnly,
                        hideLabel,
                        formFieldProps,
                      }),
                      (0, jsx_runtime.jsx)(ComboboxInput$1, {
                        ...(0, objectUtils.c)(['inputValue'], rest),
                        hideClearButton,
                        listId,
                        error,
                        hideChips,
                        handleKeyDown,
                        'aria-busy': loading,
                      }),
                      (0, jsx_runtime.jsx)(ComboboxError$1, { size, error, formFieldProps }),
                    ],
                  }),
                  open &&
                    (0, jsx_runtime.jsx)(floating_ui_react.XF, {
                      root: portal ? null : portalRef,
                      children: (0, jsx_runtime.jsx)(floating_ui_react.s3, {
                        context,
                        initialFocus: -1,
                        visuallyHiddenDismiss: !0,
                        children: (0, jsx_runtime.jsxs)(Box, {
                          id: listId,
                          shadow: 'md',
                          borderRadius: 'md',
                          borderColor: 'default',
                          'aria-labelledby': formFieldProps.inputProps.id,
                          'aria-autocomplete': 'list',
                          tabIndex: -1,
                          ...getFloatingProps({
                            ref: refs.setFloating,
                            style: { ...floatingStyles },
                          }),
                          className: (0, lite.$)(
                            'fds-combobox__options-wrapper',
                            `fds-combobox--${size}`,
                          ),
                          children: [
                            virtual &&
                              (0, jsx_runtime.jsx)('div', {
                                style: {
                                  height: `${rowVirtualizer.getTotalSize()}px`,
                                  width: '100%',
                                  position: 'relative',
                                },
                                children: rowVirtualizer.getVirtualItems().map((virtualRow) =>
                                  (0, jsx_runtime.jsx)(
                                    'div',
                                    {
                                      ref: rowVirtualizer.measureElement,
                                      'data-index': virtualRow.index,
                                      style: {
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                      },
                                      children: filteredOptionsChildren[virtualRow.index],
                                    },
                                    virtualRow.index,
                                  ),
                                ),
                              }),
                            loading
                              ? (0, jsx_runtime.jsxs)(ComboboxCustom$1, {
                                  className: 'fds-combobox__loading',
                                  children: [
                                    (0, jsx_runtime.jsx)(Spinner.y, {
                                      title: 'Laster',
                                      size: 'sm',
                                    }),
                                    loadingLabel,
                                  ],
                                })
                              : (0, jsx_runtime.jsxs)(jsx_runtime.Fragment, {
                                  children: [restChildren, !virtual && filteredOptionsChildren],
                                }),
                          ],
                        }),
                      }),
                    }),
                ],
              });
            },
          ),
          Combobox = (0, react.forwardRef)((props, ref) =>
            (0, jsx_runtime.jsx)(ComboboxIdProvider, {
              children: (0, jsx_runtime.jsx)(ComboboxComponent, { ...props, ref }),
            }),
          );
        Combobox.displayName = 'Combobox';
        const ComboboxEmpty = (0, react.forwardRef)(({ children, className, ...rest }, ref) => {
          const context = (0, react.useContext)(ComboboxContext);
          if (!context) throw new Error('ComboboxEmpty must be used within a Combobox');
          const { filteredOptions } = context;
          return (
            0 === filteredOptions.length &&
            (0, jsx_runtime.jsx)('div', {
              ref,
              className: (0, lite.$)('fds-combobox__empty', className),
              ...rest,
              children,
            })
          );
        });
        ComboboxEmpty.displayName = 'ComboboxEmpty';
        const Combobox_Combobox = Combobox;
        (Combobox_Combobox.Option = ComboboxOption),
          (Combobox_Combobox.Empty = ComboboxEmpty),
          (Combobox_Combobox.Option.displayName = 'Combobox.Option'),
          (Combobox_Combobox.Empty.displayName = 'Combobox.Empty');
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Fieldset/Fieldset.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Textarea/Textarea.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { T: () => Textarea });
        var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          lite = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          PadlockLockedFill = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js',
          ),
          CharacterCounter = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/CharacterCounter.js',
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
        var Paragraph = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
          ),
          Label = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
          ),
          objectUtils = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/objectUtils.js',
          ),
          ErrorMessage = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
          );
        const Textarea = (0, react.forwardRef)((props, ref) => {
          const { label, description, style, characterLimit, hideLabel, className, ...rest } =
              props,
            {
              textareaProps,
              descriptionId,
              hasError,
              errorId,
              size = 'md',
              readOnly,
            } = ((props) => {
              const fieldset = (0, react.useContext)(FieldsetContext.S),
                { inputProps, readOnly, ...rest } = (0, useFormField.W)(props, 'textarea'),
                size = fieldset?.size ?? (0, getSize.Y)(props.size ?? 'md');
              return {
                ...rest,
                readOnly,
                size,
                textareaProps: {
                  ...inputProps,
                  readOnly,
                  onClick: (e) => {
                    readOnly ? e.preventDefault() : props?.onClick?.(e);
                  },
                  onChange: (e) => {
                    readOnly ? e.preventDefault() : props?.onChange?.(e);
                  },
                },
              };
            })(props),
            [value, setValue] = (0, react.useState)(props.defaultValue),
            characterLimitId = `${textareaProps.id}-charactercount}`,
            hasCharacterLimit = null != characterLimit,
            describedBy =
              (0, lite.$)(
                textareaProps['aria-describedby'],
                hasCharacterLimit && characterLimitId,
              ) || void 0;
          return (0, jsx_runtime.jsx)(Paragraph.f, {
            asChild: !0,
            size,
            children: (0, jsx_runtime.jsxs)('div', {
              style,
              className: (0, lite.$)(
                'fds-textarea',
                `fds-textarea--${size}`,
                hasError && 'fds-textarea--error',
                className,
              ),
              children: [
                label &&
                  (0, jsx_runtime.jsxs)(Label.J, {
                    size,
                    weight: 'medium',
                    htmlFor: textareaProps.id,
                    className: (0, lite.$)('fds-textarea__label', hideLabel && 'fds-sr-only'),
                    children: [
                      readOnly &&
                        (0, jsx_runtime.jsx)(PadlockLockedFill.A, {
                          'aria-hidden': !0,
                          className: 'fds-textarea__readonly-icon',
                        }),
                      (0, jsx_runtime.jsx)('span', { children: label }),
                    ],
                  }),
                description &&
                  (0, jsx_runtime.jsx)(Paragraph.f, {
                    asChild: !0,
                    size,
                    children: (0, jsx_runtime.jsx)('div', {
                      id: descriptionId,
                      className: (0, lite.$)(
                        'fds-textarea__description',
                        hideLabel && 'fds-sr-only',
                      ),
                      children: description,
                    }),
                  }),
                (0, jsx_runtime.jsx)('textarea', {
                  className: (0, lite.$)('fds-textarea__input', 'fds-focus'),
                  ref,
                  'aria-describedby': describedBy,
                  disabled: textareaProps.disabled,
                  readOnly,
                  ...(0, objectUtils.c)(['size', 'error', 'errorId'], rest),
                  ...textareaProps,
                  onChange: (e) => {
                    textareaProps?.onChange?.(e), setValue(e.target.value);
                  },
                }),
                hasCharacterLimit &&
                  (0, jsx_runtime.jsx)(CharacterCounter.c, {
                    size,
                    value: value ? value.toString() : '',
                    id: characterLimitId,
                    ...characterLimit,
                  }),
                (0, jsx_runtime.jsx)('div', {
                  className: 'fds-textarea__error-message',
                  id: errorId,
                  'aria-live': 'polite',
                  'aria-relevant': 'additions removals',
                  children:
                    hasError &&
                    (0, jsx_runtime.jsx)(ErrorMessage.K, { size, children: props.error }),
                }),
              ],
            }),
          });
        });
        Textarea.displayName = 'Textarea';
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/Textfield/Textfield.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { q: () => Textfield });
        var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
          react = __webpack_require__('../../../node_modules/react/index.js'),
          lite = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          PadlockLockedFill = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/PadlockLockedFill.js',
          ),
          CharacterCounter = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/CharacterCounter.js',
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
        var Paragraph = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
          ),
          Label = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
          ),
          objectUtils = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/objectUtils.js',
          ),
          ErrorMessage = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/ErrorMessage/ErrorMessage.js',
          );
        const Textfield = (0, react.forwardRef)((props, ref) => {
          const {
              label,
              description,
              suffix,
              prefix,
              style,
              characterLimit,
              hideLabel,
              type = 'text',
              htmlSize = 20,
              className,
              ...rest
            } = props,
            {
              inputProps,
              descriptionId,
              hasError,
              errorId,
              size = 'md',
              readOnly,
            } = ((props) => {
              const fieldset = (0, react.useContext)(FieldsetContext.S),
                { inputProps, readOnly, ...rest } = (0, useFormField.W)(props, 'textfield'),
                size = (0, getSize.Y)(fieldset?.size ?? props.size ?? 'md');
              return {
                ...rest,
                readOnly,
                size,
                inputProps: {
                  ...inputProps,
                  readOnly,
                  onClick: (e) => {
                    readOnly ? e.preventDefault() : props?.onClick?.(e);
                  },
                  onChange: (e) => {
                    readOnly ? e.preventDefault() : props?.onChange?.(e);
                  },
                },
              };
            })(props),
            [inputValue, setInputValue] = (0, react.useState)(props.value || props.defaultValue),
            characterLimitId = `textfield-charactercount-${(0, react.useId)()}`,
            hasCharacterLimit = null != characterLimit,
            describedBy =
              (0, lite.$)(inputProps['aria-describedby'], hasCharacterLimit && characterLimitId) ||
              void 0;
          return (0, jsx_runtime.jsx)(Paragraph.f, {
            asChild: !0,
            size,
            children: (0, jsx_runtime.jsxs)('div', {
              style,
              className: (0, lite.$)(
                'fds-textfield',
                `fds-textfield--${size}`,
                readOnly && 'fds-textfield--readonly',
                hasError && 'fds-textfield--error',
                className,
              ),
              children: [
                label &&
                  (0, jsx_runtime.jsxs)(Label.J, {
                    size,
                    weight: 'medium',
                    htmlFor: inputProps.id,
                    className: (0, lite.$)('fds-textfield__label', hideLabel && 'fds-sr-only'),
                    children: [
                      readOnly &&
                        (0, jsx_runtime.jsx)(PadlockLockedFill.A, {
                          'aria-hidden': !0,
                          className: 'fds-textfield__readonly__icon',
                        }),
                      (0, jsx_runtime.jsx)('span', { children: label }),
                    ],
                  }),
                description &&
                  (0, jsx_runtime.jsx)(Paragraph.f, {
                    asChild: !0,
                    size,
                    children: (0, jsx_runtime.jsx)('div', {
                      id: descriptionId,
                      className: (0, lite.$)(
                        'fds-textfield__description',
                        hideLabel && 'fds-sr-only',
                      ),
                      children: description,
                    }),
                  }),
                (0, jsx_runtime.jsxs)('div', {
                  className: 'fds-textfield__field',
                  children: [
                    prefix &&
                      (0, jsx_runtime.jsx)(Paragraph.f, {
                        asChild: !0,
                        size,
                        variant: 'short',
                        children: (0, jsx_runtime.jsx)('div', {
                          className: (0, lite.$)(
                            'fds-textfield__adornment',
                            'fds-textfield__prefix',
                          ),
                          'aria-hidden': 'true',
                          children: prefix,
                        }),
                      }),
                    (0, jsx_runtime.jsx)('input', {
                      className: (0, lite.$)(
                        'fds-textfield__input',
                        'fds-focus',
                        prefix && 'fds-textfield__input--with-prefix',
                        suffix && 'fds-textfield__input--with-suffix',
                      ),
                      ref,
                      type,
                      disabled: inputProps.disabled,
                      'aria-describedby': describedBy,
                      size: htmlSize,
                      ...(0, objectUtils.c)(['size', 'error', 'errorId'], rest),
                      ...inputProps,
                      onChange: (e) => {
                        inputProps?.onChange?.(e), setInputValue(e.target.value);
                      },
                    }),
                    suffix &&
                      (0, jsx_runtime.jsx)(Paragraph.f, {
                        asChild: !0,
                        size,
                        variant: 'short',
                        children: (0, jsx_runtime.jsx)('div', {
                          className: (0, lite.$)(
                            'fds-textfield__adornment',
                            'fds-textfield__suffix',
                          ),
                          'aria-hidden': 'true',
                          children: suffix,
                        }),
                      }),
                  ],
                }),
                hasCharacterLimit &&
                  (0, jsx_runtime.jsx)(CharacterCounter.c, {
                    size,
                    value: inputValue ? inputValue.toString() : '',
                    id: characterLimitId,
                    ...characterLimit,
                  }),
                (0, jsx_runtime.jsx)('div', {
                  className: 'fds-textfield__error-message',
                  id: errorId,
                  'aria-live': 'polite',
                  'aria-relevant': 'additions removals',
                  children:
                    hasError &&
                    (0, jsx_runtime.jsx)(ErrorMessage.K, { size, children: props.error }),
                }),
              ],
            }),
          });
        });
        Textfield.displayName = 'Textfield';
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
    '../../../node_modules/ajv/dist/ajv.js': (module, exports, __webpack_require__) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.MissingRefError =
          exports.ValidationError =
          exports.CodeGen =
          exports.Name =
          exports.nil =
          exports.stringify =
          exports.str =
          exports._ =
          exports.KeywordCxt =
          exports.Ajv =
            void 0);
      const core_1 = __webpack_require__('../../../node_modules/ajv/dist/core.js'),
        draft7_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/draft7.js'),
        discriminator_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/discriminator/index.js',
        ),
        draft7MetaSchema = __webpack_require__(
          '../../../node_modules/ajv/dist/refs/json-schema-draft-07.json',
        ),
        META_SUPPORT_DATA = ['/properties'],
        META_SCHEMA_ID = 'http://json-schema.org/draft-07/schema';
      class Ajv extends core_1.default {
        _addVocabularies() {
          super._addVocabularies(),
            draft7_1.default.forEach((v) => this.addVocabulary(v)),
            this.opts.discriminator && this.addKeyword(discriminator_1.default);
        }
        _addDefaultMetaSchema() {
          if ((super._addDefaultMetaSchema(), !this.opts.meta)) return;
          const metaSchema = this.opts.$data
            ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA)
            : draft7MetaSchema;
          this.addMetaSchema(metaSchema, META_SCHEMA_ID, !1),
            (this.refs['http://json-schema.org/schema'] = META_SCHEMA_ID);
        }
        defaultMeta() {
          return (this.opts.defaultMeta =
            super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0));
        }
      }
      (exports.Ajv = Ajv),
        (module.exports = exports = Ajv),
        (module.exports.Ajv = Ajv),
        Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.default = Ajv);
      var validate_1 = __webpack_require__(
        '../../../node_modules/ajv/dist/compile/validate/index.js',
      );
      Object.defineProperty(exports, 'KeywordCxt', {
        enumerable: !0,
        get: function () {
          return validate_1.KeywordCxt;
        },
      });
      var codegen_1 = __webpack_require__(
        '../../../node_modules/ajv/dist/compile/codegen/index.js',
      );
      Object.defineProperty(exports, '_', {
        enumerable: !0,
        get: function () {
          return codegen_1._;
        },
      }),
        Object.defineProperty(exports, 'str', {
          enumerable: !0,
          get: function () {
            return codegen_1.str;
          },
        }),
        Object.defineProperty(exports, 'stringify', {
          enumerable: !0,
          get: function () {
            return codegen_1.stringify;
          },
        }),
        Object.defineProperty(exports, 'nil', {
          enumerable: !0,
          get: function () {
            return codegen_1.nil;
          },
        }),
        Object.defineProperty(exports, 'Name', {
          enumerable: !0,
          get: function () {
            return codegen_1.Name;
          },
        }),
        Object.defineProperty(exports, 'CodeGen', {
          enumerable: !0,
          get: function () {
            return codegen_1.CodeGen;
          },
        });
      var validation_error_1 = __webpack_require__(
        '../../../node_modules/ajv/dist/runtime/validation_error.js',
      );
      Object.defineProperty(exports, 'ValidationError', {
        enumerable: !0,
        get: function () {
          return validation_error_1.default;
        },
      });
      var ref_error_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/ref_error.js');
      Object.defineProperty(exports, 'MissingRefError', {
        enumerable: !0,
        get: function () {
          return ref_error_1.default;
        },
      });
    },
    '../../../node_modules/ajv/dist/compile/codegen/code.js': (
      __unused_webpack_module,
      exports,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.regexpCode =
          exports.getEsmExportName =
          exports.getProperty =
          exports.safeStringify =
          exports.stringify =
          exports.strConcat =
          exports.addCodeArg =
          exports.str =
          exports._ =
          exports.nil =
          exports._Code =
          exports.Name =
          exports.IDENTIFIER =
          exports._CodeOrName =
            void 0);
      class _CodeOrName {}
      (exports._CodeOrName = _CodeOrName), (exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i);
      class Name extends _CodeOrName {
        constructor(s) {
          if ((super(), !exports.IDENTIFIER.test(s)))
            throw new Error('CodeGen: name must be a valid identifier');
          this.str = s;
        }
        toString() {
          return this.str;
        }
        emptyStr() {
          return !1;
        }
        get names() {
          return { [this.str]: 1 };
        }
      }
      exports.Name = Name;
      class _Code extends _CodeOrName {
        constructor(code) {
          super(), (this._items = 'string' == typeof code ? [code] : code);
        }
        toString() {
          return this.str;
        }
        emptyStr() {
          if (this._items.length > 1) return !1;
          const item = this._items[0];
          return '' === item || '""' === item;
        }
        get str() {
          var _a;
          return null !== (_a = this._str) && void 0 !== _a
            ? _a
            : (this._str = this._items.reduce((s, c) => `${s}${c}`, ''));
        }
        get names() {
          var _a;
          return null !== (_a = this._names) && void 0 !== _a
            ? _a
            : (this._names = this._items.reduce(
                (names, c) => (
                  c instanceof Name && (names[c.str] = (names[c.str] || 0) + 1), names
                ),
                {},
              ));
        }
      }
      function _(strs, ...args) {
        const code = [strs[0]];
        let i = 0;
        for (; i < args.length; ) addCodeArg(code, args[i]), code.push(strs[++i]);
        return new _Code(code);
      }
      (exports._Code = _Code), (exports.nil = new _Code('')), (exports._ = _);
      const plus = new _Code('+');
      function str(strs, ...args) {
        const expr = [safeStringify(strs[0])];
        let i = 0;
        for (; i < args.length; )
          expr.push(plus), addCodeArg(expr, args[i]), expr.push(plus, safeStringify(strs[++i]));
        return (
          (function optimize(expr) {
            let i = 1;
            for (; i < expr.length - 1; ) {
              if (expr[i] === plus) {
                const res = mergeExprItems(expr[i - 1], expr[i + 1]);
                if (void 0 !== res) {
                  expr.splice(i - 1, 3, res);
                  continue;
                }
                expr[i++] = '+';
              }
              i++;
            }
          })(expr),
          new _Code(expr)
        );
      }
      function addCodeArg(code, arg) {
        arg instanceof _Code
          ? code.push(...arg._items)
          : arg instanceof Name
            ? code.push(arg)
            : code.push(
                (function interpolate(x) {
                  return 'number' == typeof x || 'boolean' == typeof x || null === x
                    ? x
                    : safeStringify(Array.isArray(x) ? x.join(',') : x);
                })(arg),
              );
      }
      function mergeExprItems(a, b) {
        if ('""' === b) return a;
        if ('""' === a) return b;
        if ('string' == typeof a) {
          if (b instanceof Name || '"' !== a[a.length - 1]) return;
          return 'string' != typeof b
            ? `${a.slice(0, -1)}${b}"`
            : '"' === b[0]
              ? a.slice(0, -1) + b.slice(1)
              : void 0;
        }
        return 'string' != typeof b || '"' !== b[0] || a instanceof Name
          ? void 0
          : `"${a}${b.slice(1)}`;
      }
      function safeStringify(x) {
        return JSON.stringify(x)
          .replace(/\u2028/g, '\\u2028')
          .replace(/\u2029/g, '\\u2029');
      }
      (exports.str = str),
        (exports.addCodeArg = addCodeArg),
        (exports.strConcat = function strConcat(c1, c2) {
          return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
        }),
        (exports.stringify = function stringify(x) {
          return new _Code(safeStringify(x));
        }),
        (exports.safeStringify = safeStringify),
        (exports.getProperty = function getProperty(key) {
          return 'string' == typeof key && exports.IDENTIFIER.test(key)
            ? new _Code(`.${key}`)
            : _`[${key}]`;
        }),
        (exports.getEsmExportName = function getEsmExportName(key) {
          if ('string' == typeof key && exports.IDENTIFIER.test(key)) return new _Code(`${key}`);
          throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
        }),
        (exports.regexpCode = function regexpCode(rx) {
          return new _Code(rx.toString());
        });
    },
    '../../../node_modules/ajv/dist/compile/codegen/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.or =
          exports.and =
          exports.not =
          exports.CodeGen =
          exports.operators =
          exports.varKinds =
          exports.ValueScopeName =
          exports.ValueScope =
          exports.Scope =
          exports.Name =
          exports.regexpCode =
          exports.stringify =
          exports.getProperty =
          exports.nil =
          exports.strConcat =
          exports.str =
          exports._ =
            void 0);
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/code.js'),
        scope_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/scope.js');
      var code_2 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/code.js');
      Object.defineProperty(exports, '_', {
        enumerable: !0,
        get: function () {
          return code_2._;
        },
      }),
        Object.defineProperty(exports, 'str', {
          enumerable: !0,
          get: function () {
            return code_2.str;
          },
        }),
        Object.defineProperty(exports, 'strConcat', {
          enumerable: !0,
          get: function () {
            return code_2.strConcat;
          },
        }),
        Object.defineProperty(exports, 'nil', {
          enumerable: !0,
          get: function () {
            return code_2.nil;
          },
        }),
        Object.defineProperty(exports, 'getProperty', {
          enumerable: !0,
          get: function () {
            return code_2.getProperty;
          },
        }),
        Object.defineProperty(exports, 'stringify', {
          enumerable: !0,
          get: function () {
            return code_2.stringify;
          },
        }),
        Object.defineProperty(exports, 'regexpCode', {
          enumerable: !0,
          get: function () {
            return code_2.regexpCode;
          },
        }),
        Object.defineProperty(exports, 'Name', {
          enumerable: !0,
          get: function () {
            return code_2.Name;
          },
        });
      var scope_2 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/scope.js');
      Object.defineProperty(exports, 'Scope', {
        enumerable: !0,
        get: function () {
          return scope_2.Scope;
        },
      }),
        Object.defineProperty(exports, 'ValueScope', {
          enumerable: !0,
          get: function () {
            return scope_2.ValueScope;
          },
        }),
        Object.defineProperty(exports, 'ValueScopeName', {
          enumerable: !0,
          get: function () {
            return scope_2.ValueScopeName;
          },
        }),
        Object.defineProperty(exports, 'varKinds', {
          enumerable: !0,
          get: function () {
            return scope_2.varKinds;
          },
        }),
        (exports.operators = {
          GT: new code_1._Code('>'),
          GTE: new code_1._Code('>='),
          LT: new code_1._Code('<'),
          LTE: new code_1._Code('<='),
          EQ: new code_1._Code('==='),
          NEQ: new code_1._Code('!=='),
          NOT: new code_1._Code('!'),
          OR: new code_1._Code('||'),
          AND: new code_1._Code('&&'),
          ADD: new code_1._Code('+'),
        });
      class Node {
        optimizeNodes() {
          return this;
        }
        optimizeNames(_names, _constants) {
          return this;
        }
      }
      class Def extends Node {
        constructor(varKind, name, rhs) {
          super(), (this.varKind = varKind), (this.name = name), (this.rhs = rhs);
        }
        render({ es5, _n }) {
          const varKind = es5 ? scope_1.varKinds.var : this.varKind,
            rhs = void 0 === this.rhs ? '' : ` = ${this.rhs}`;
          return `${varKind} ${this.name}${rhs};` + _n;
        }
        optimizeNames(names, constants) {
          if (names[this.name.str])
            return this.rhs && (this.rhs = optimizeExpr(this.rhs, names, constants)), this;
        }
        get names() {
          return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
        }
      }
      class Assign extends Node {
        constructor(lhs, rhs, sideEffects) {
          super(), (this.lhs = lhs), (this.rhs = rhs), (this.sideEffects = sideEffects);
        }
        render({ _n }) {
          return `${this.lhs} = ${this.rhs};` + _n;
        }
        optimizeNames(names, constants) {
          if (!(this.lhs instanceof code_1.Name) || names[this.lhs.str] || this.sideEffects)
            return (this.rhs = optimizeExpr(this.rhs, names, constants)), this;
        }
        get names() {
          return addExprNames(
            this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names },
            this.rhs,
          );
        }
      }
      class AssignOp extends Assign {
        constructor(lhs, op, rhs, sideEffects) {
          super(lhs, rhs, sideEffects), (this.op = op);
        }
        render({ _n }) {
          return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
        }
      }
      class Label extends Node {
        constructor(label) {
          super(), (this.label = label), (this.names = {});
        }
        render({ _n }) {
          return `${this.label}:` + _n;
        }
      }
      class Break extends Node {
        constructor(label) {
          super(), (this.label = label), (this.names = {});
        }
        render({ _n }) {
          return `break${this.label ? ` ${this.label}` : ''};` + _n;
        }
      }
      class Throw extends Node {
        constructor(error) {
          super(), (this.error = error);
        }
        render({ _n }) {
          return `throw ${this.error};` + _n;
        }
        get names() {
          return this.error.names;
        }
      }
      class AnyCode extends Node {
        constructor(code) {
          super(), (this.code = code);
        }
        render({ _n }) {
          return `${this.code};` + _n;
        }
        optimizeNodes() {
          return `${this.code}` ? this : void 0;
        }
        optimizeNames(names, constants) {
          return (this.code = optimizeExpr(this.code, names, constants)), this;
        }
        get names() {
          return this.code instanceof code_1._CodeOrName ? this.code.names : {};
        }
      }
      class ParentNode extends Node {
        constructor(nodes = []) {
          super(), (this.nodes = nodes);
        }
        render(opts) {
          return this.nodes.reduce((code, n) => code + n.render(opts), '');
        }
        optimizeNodes() {
          const { nodes } = this;
          let i = nodes.length;
          for (; i--; ) {
            const n = nodes[i].optimizeNodes();
            Array.isArray(n) ? nodes.splice(i, 1, ...n) : n ? (nodes[i] = n) : nodes.splice(i, 1);
          }
          return nodes.length > 0 ? this : void 0;
        }
        optimizeNames(names, constants) {
          const { nodes } = this;
          let i = nodes.length;
          for (; i--; ) {
            const n = nodes[i];
            n.optimizeNames(names, constants) ||
              (subtractNames(names, n.names), nodes.splice(i, 1));
          }
          return nodes.length > 0 ? this : void 0;
        }
        get names() {
          return this.nodes.reduce((names, n) => addNames(names, n.names), {});
        }
      }
      class BlockNode extends ParentNode {
        render(opts) {
          return '{' + opts._n + super.render(opts) + '}' + opts._n;
        }
      }
      class Root extends ParentNode {}
      class Else extends BlockNode {}
      Else.kind = 'else';
      class If extends BlockNode {
        constructor(condition, nodes) {
          super(nodes), (this.condition = condition);
        }
        render(opts) {
          let code = `if(${this.condition})` + super.render(opts);
          return this.else && (code += 'else ' + this.else.render(opts)), code;
        }
        optimizeNodes() {
          super.optimizeNodes();
          const cond = this.condition;
          if (!0 === cond) return this.nodes;
          let e = this.else;
          if (e) {
            const ns = e.optimizeNodes();
            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
          }
          return e
            ? !1 === cond
              ? e instanceof If
                ? e
                : e.nodes
              : this.nodes.length
                ? this
                : new If(not(cond), e instanceof If ? [e] : e.nodes)
            : !1 !== cond && this.nodes.length
              ? this
              : void 0;
        }
        optimizeNames(names, constants) {
          var _a;
          if (
            ((this.else =
              null === (_a = this.else) || void 0 === _a
                ? void 0
                : _a.optimizeNames(names, constants)),
            super.optimizeNames(names, constants) || this.else)
          )
            return (this.condition = optimizeExpr(this.condition, names, constants)), this;
        }
        get names() {
          const names = super.names;
          return (
            addExprNames(names, this.condition),
            this.else && addNames(names, this.else.names),
            names
          );
        }
      }
      If.kind = 'if';
      class For extends BlockNode {}
      For.kind = 'for';
      class ForLoop extends For {
        constructor(iteration) {
          super(), (this.iteration = iteration);
        }
        render(opts) {
          return `for(${this.iteration})` + super.render(opts);
        }
        optimizeNames(names, constants) {
          if (super.optimizeNames(names, constants))
            return (this.iteration = optimizeExpr(this.iteration, names, constants)), this;
        }
        get names() {
          return addNames(super.names, this.iteration.names);
        }
      }
      class ForRange extends For {
        constructor(varKind, name, from, to) {
          super(), (this.varKind = varKind), (this.name = name), (this.from = from), (this.to = to);
        }
        render(opts) {
          const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind,
            { name, from, to } = this;
          return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
        }
        get names() {
          const names = addExprNames(super.names, this.from);
          return addExprNames(names, this.to);
        }
      }
      class ForIter extends For {
        constructor(loop, varKind, name, iterable) {
          super(),
            (this.loop = loop),
            (this.varKind = varKind),
            (this.name = name),
            (this.iterable = iterable);
        }
        render(opts) {
          return (
            `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts)
          );
        }
        optimizeNames(names, constants) {
          if (super.optimizeNames(names, constants))
            return (this.iterable = optimizeExpr(this.iterable, names, constants)), this;
        }
        get names() {
          return addNames(super.names, this.iterable.names);
        }
      }
      class Func extends BlockNode {
        constructor(name, args, async) {
          super(), (this.name = name), (this.args = args), (this.async = async);
        }
        render(opts) {
          return (
            `${this.async ? 'async ' : ''}function ${this.name}(${this.args})` + super.render(opts)
          );
        }
      }
      Func.kind = 'func';
      class Return extends ParentNode {
        render(opts) {
          return 'return ' + super.render(opts);
        }
      }
      Return.kind = 'return';
      class Try extends BlockNode {
        render(opts) {
          let code = 'try' + super.render(opts);
          return (
            this.catch && (code += this.catch.render(opts)),
            this.finally && (code += this.finally.render(opts)),
            code
          );
        }
        optimizeNodes() {
          var _a, _b;
          return (
            super.optimizeNodes(),
            null === (_a = this.catch) || void 0 === _a || _a.optimizeNodes(),
            null === (_b = this.finally) || void 0 === _b || _b.optimizeNodes(),
            this
          );
        }
        optimizeNames(names, constants) {
          var _a, _b;
          return (
            super.optimizeNames(names, constants),
            null === (_a = this.catch) || void 0 === _a || _a.optimizeNames(names, constants),
            null === (_b = this.finally) || void 0 === _b || _b.optimizeNames(names, constants),
            this
          );
        }
        get names() {
          const names = super.names;
          return (
            this.catch && addNames(names, this.catch.names),
            this.finally && addNames(names, this.finally.names),
            names
          );
        }
      }
      class Catch extends BlockNode {
        constructor(error) {
          super(), (this.error = error);
        }
        render(opts) {
          return `catch(${this.error})` + super.render(opts);
        }
      }
      Catch.kind = 'catch';
      class Finally extends BlockNode {
        render(opts) {
          return 'finally' + super.render(opts);
        }
      }
      Finally.kind = 'finally';
      function addNames(names, from) {
        for (const n in from) names[n] = (names[n] || 0) + (from[n] || 0);
        return names;
      }
      function addExprNames(names, from) {
        return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
      }
      function optimizeExpr(expr, names, constants) {
        return expr instanceof code_1.Name
          ? replaceName(expr)
          : (function canOptimize(e) {
                return (
                  e instanceof code_1._Code &&
                  e._items.some(
                    (c) =>
                      c instanceof code_1.Name && 1 === names[c.str] && void 0 !== constants[c.str],
                  )
                );
              })(expr)
            ? new code_1._Code(
                expr._items.reduce(
                  (items, c) => (
                    c instanceof code_1.Name && (c = replaceName(c)),
                    c instanceof code_1._Code ? items.push(...c._items) : items.push(c),
                    items
                  ),
                  [],
                ),
              )
            : expr;
        function replaceName(n) {
          const c = constants[n.str];
          return void 0 === c || 1 !== names[n.str] ? n : (delete names[n.str], c);
        }
      }
      function subtractNames(names, from) {
        for (const n in from) names[n] = (names[n] || 0) - (from[n] || 0);
      }
      function not(x) {
        return 'boolean' == typeof x || 'number' == typeof x || null === x
          ? !x
          : code_1._`!${par(x)}`;
      }
      (exports.CodeGen = class CodeGen {
        constructor(extScope, opts = {}) {
          (this._values = {}),
            (this._blockStarts = []),
            (this._constants = {}),
            (this.opts = { ...opts, _n: opts.lines ? '\n' : '' }),
            (this._extScope = extScope),
            (this._scope = new scope_1.Scope({ parent: extScope })),
            (this._nodes = [new Root()]);
        }
        toString() {
          return this._root.render(this.opts);
        }
        name(prefix) {
          return this._scope.name(prefix);
        }
        scopeName(prefix) {
          return this._extScope.name(prefix);
        }
        scopeValue(prefixOrName, value) {
          const name = this._extScope.value(prefixOrName, value);
          return (
            (this._values[name.prefix] || (this._values[name.prefix] = new Set())).add(name), name
          );
        }
        getScopeValue(prefix, keyOrRef) {
          return this._extScope.getValue(prefix, keyOrRef);
        }
        scopeRefs(scopeName) {
          return this._extScope.scopeRefs(scopeName, this._values);
        }
        scopeCode() {
          return this._extScope.scopeCode(this._values);
        }
        _def(varKind, nameOrPrefix, rhs, constant) {
          const name = this._scope.toName(nameOrPrefix);
          return (
            void 0 !== rhs && constant && (this._constants[name.str] = rhs),
            this._leafNode(new Def(varKind, name, rhs)),
            name
          );
        }
        const(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
        }
        let(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
        }
        var(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
        }
        assign(lhs, rhs, sideEffects) {
          return this._leafNode(new Assign(lhs, rhs, sideEffects));
        }
        add(lhs, rhs) {
          return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
        }
        code(c) {
          return (
            'function' == typeof c ? c() : c !== code_1.nil && this._leafNode(new AnyCode(c)), this
          );
        }
        object(...keyValues) {
          const code = ['{'];
          for (const [key, value] of keyValues)
            code.length > 1 && code.push(','),
              code.push(key),
              (key !== value || this.opts.es5) &&
                (code.push(':'), (0, code_1.addCodeArg)(code, value));
          return code.push('}'), new code_1._Code(code);
        }
        if(condition, thenBody, elseBody) {
          if ((this._blockNode(new If(condition)), thenBody && elseBody))
            this.code(thenBody).else().code(elseBody).endIf();
          else if (thenBody) this.code(thenBody).endIf();
          else if (elseBody) throw new Error('CodeGen: "else" body without "then" body');
          return this;
        }
        elseIf(condition) {
          return this._elseNode(new If(condition));
        }
        else() {
          return this._elseNode(new Else());
        }
        endIf() {
          return this._endBlockNode(If, Else);
        }
        _for(node, forBody) {
          return this._blockNode(node), forBody && this.code(forBody).endFor(), this;
        }
        for(iteration, forBody) {
          return this._for(new ForLoop(iteration), forBody);
        }
        forRange(
          nameOrPrefix,
          from,
          to,
          forBody,
          varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let,
        ) {
          const name = this._scope.toName(nameOrPrefix);
          return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
        }
        forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
          const name = this._scope.toName(nameOrPrefix);
          if (this.opts.es5) {
            const arr = iterable instanceof code_1.Name ? iterable : this.var('_arr', iterable);
            return this.forRange('_i', 0, code_1._`${arr}.length`, (i) => {
              this.var(name, code_1._`${arr}[${i}]`), forBody(name);
            });
          }
          return this._for(new ForIter('of', varKind, name, iterable), () => forBody(name));
        }
        forIn(
          nameOrPrefix,
          obj,
          forBody,
          varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const,
        ) {
          if (this.opts.ownProperties)
            return this.forOf(nameOrPrefix, code_1._`Object.keys(${obj})`, forBody);
          const name = this._scope.toName(nameOrPrefix);
          return this._for(new ForIter('in', varKind, name, obj), () => forBody(name));
        }
        endFor() {
          return this._endBlockNode(For);
        }
        label(label) {
          return this._leafNode(new Label(label));
        }
        break(label) {
          return this._leafNode(new Break(label));
        }
        return(value) {
          const node = new Return();
          if ((this._blockNode(node), this.code(value), 1 !== node.nodes.length))
            throw new Error('CodeGen: "return" should have one node');
          return this._endBlockNode(Return);
        }
        try(tryBody, catchCode, finallyCode) {
          if (!catchCode && !finallyCode)
            throw new Error('CodeGen: "try" without "catch" and "finally"');
          const node = new Try();
          if ((this._blockNode(node), this.code(tryBody), catchCode)) {
            const error = this.name('e');
            (this._currNode = node.catch = new Catch(error)), catchCode(error);
          }
          return (
            finallyCode &&
              ((this._currNode = node.finally = new Finally()), this.code(finallyCode)),
            this._endBlockNode(Catch, Finally)
          );
        }
        throw(error) {
          return this._leafNode(new Throw(error));
        }
        block(body, nodeCount) {
          return (
            this._blockStarts.push(this._nodes.length),
            body && this.code(body).endBlock(nodeCount),
            this
          );
        }
        endBlock(nodeCount) {
          const len = this._blockStarts.pop();
          if (void 0 === len) throw new Error('CodeGen: not in self-balancing block');
          const toClose = this._nodes.length - len;
          if (toClose < 0 || (void 0 !== nodeCount && toClose !== nodeCount))
            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
          return (this._nodes.length = len), this;
        }
        func(name, args = code_1.nil, async, funcBody) {
          return (
            this._blockNode(new Func(name, args, async)),
            funcBody && this.code(funcBody).endFunc(),
            this
          );
        }
        endFunc() {
          return this._endBlockNode(Func);
        }
        optimize(n = 1) {
          for (; n-- > 0; )
            this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
        }
        _leafNode(node) {
          return this._currNode.nodes.push(node), this;
        }
        _blockNode(node) {
          this._currNode.nodes.push(node), this._nodes.push(node);
        }
        _endBlockNode(N1, N2) {
          const n = this._currNode;
          if (n instanceof N1 || (N2 && n instanceof N2)) return this._nodes.pop(), this;
          throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
        }
        _elseNode(node) {
          const n = this._currNode;
          if (!(n instanceof If)) throw new Error('CodeGen: "else" without "if"');
          return (this._currNode = n.else = node), this;
        }
        get _root() {
          return this._nodes[0];
        }
        get _currNode() {
          const ns = this._nodes;
          return ns[ns.length - 1];
        }
        set _currNode(node) {
          const ns = this._nodes;
          ns[ns.length - 1] = node;
        }
      }),
        (exports.not = not);
      const andCode = mappend(exports.operators.AND);
      exports.and = function and(...args) {
        return args.reduce(andCode);
      };
      const orCode = mappend(exports.operators.OR);
      function mappend(op) {
        return (x, y) =>
          x === code_1.nil ? y : y === code_1.nil ? x : code_1._`${par(x)} ${op} ${par(y)}`;
      }
      function par(x) {
        return x instanceof code_1.Name ? x : code_1._`(${x})`;
      }
      exports.or = function or(...args) {
        return args.reduce(orCode);
      };
    },
    '../../../node_modules/ajv/dist/compile/codegen/scope.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.ValueScope =
          exports.ValueScopeName =
          exports.Scope =
          exports.varKinds =
          exports.UsedValueState =
            void 0);
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/code.js');
      class ValueError extends Error {
        constructor(name) {
          super(`CodeGen: "code" for ${name} not defined`), (this.value = name.value);
        }
      }
      var UsedValueState;
      !(function (UsedValueState) {
        (UsedValueState[(UsedValueState.Started = 0)] = 'Started'),
          (UsedValueState[(UsedValueState.Completed = 1)] = 'Completed');
      })(UsedValueState || (exports.UsedValueState = UsedValueState = {})),
        (exports.varKinds = {
          const: new code_1.Name('const'),
          let: new code_1.Name('let'),
          var: new code_1.Name('var'),
        });
      class Scope {
        constructor({ prefixes, parent } = {}) {
          (this._names = {}), (this._prefixes = prefixes), (this._parent = parent);
        }
        toName(nameOrPrefix) {
          return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
        }
        name(prefix) {
          return new code_1.Name(this._newName(prefix));
        }
        _newName(prefix) {
          return `${prefix}${(this._names[prefix] || this._nameGroup(prefix)).index++}`;
        }
        _nameGroup(prefix) {
          var _a, _b;
          if (
            (null ===
              (_b = null === (_a = this._parent) || void 0 === _a ? void 0 : _a._prefixes) ||
            void 0 === _b
              ? void 0
              : _b.has(prefix)) ||
            (this._prefixes && !this._prefixes.has(prefix))
          )
            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
          return (this._names[prefix] = { prefix, index: 0 });
        }
      }
      exports.Scope = Scope;
      class ValueScopeName extends code_1.Name {
        constructor(prefix, nameStr) {
          super(nameStr), (this.prefix = prefix);
        }
        setValue(value, { property, itemIndex }) {
          (this.value = value),
            (this.scopePath = code_1._`.${new code_1.Name(property)}[${itemIndex}]`);
        }
      }
      exports.ValueScopeName = ValueScopeName;
      const line = code_1._`\n`;
      exports.ValueScope = class ValueScope extends Scope {
        constructor(opts) {
          super(opts),
            (this._values = {}),
            (this._scope = opts.scope),
            (this.opts = { ...opts, _n: opts.lines ? line : code_1.nil });
        }
        get() {
          return this._scope;
        }
        name(prefix) {
          return new ValueScopeName(prefix, this._newName(prefix));
        }
        value(nameOrPrefix, value) {
          var _a;
          if (void 0 === value.ref) throw new Error('CodeGen: ref must be passed in value');
          const name = this.toName(nameOrPrefix),
            { prefix } = name,
            valueKey = null !== (_a = value.key) && void 0 !== _a ? _a : value.ref;
          let vs = this._values[prefix];
          if (vs) {
            const _name = vs.get(valueKey);
            if (_name) return _name;
          } else vs = this._values[prefix] = new Map();
          vs.set(valueKey, name);
          const s = this._scope[prefix] || (this._scope[prefix] = []),
            itemIndex = s.length;
          return (
            (s[itemIndex] = value.ref), name.setValue(value, { property: prefix, itemIndex }), name
          );
        }
        getValue(prefix, keyOrRef) {
          const vs = this._values[prefix];
          if (vs) return vs.get(keyOrRef);
        }
        scopeRefs(scopeName, values = this._values) {
          return this._reduceValues(values, (name) => {
            if (void 0 === name.scopePath) throw new Error(`CodeGen: name "${name}" has no value`);
            return code_1._`${scopeName}${name.scopePath}`;
          });
        }
        scopeCode(values = this._values, usedValues, getCode) {
          return this._reduceValues(
            values,
            (name) => {
              if (void 0 === name.value) throw new Error(`CodeGen: name "${name}" has no value`);
              return name.value.code;
            },
            usedValues,
            getCode,
          );
        }
        _reduceValues(values, valueCode, usedValues = {}, getCode) {
          let code = code_1.nil;
          for (const prefix in values) {
            const vs = values[prefix];
            if (!vs) continue;
            const nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
            vs.forEach((name) => {
              if (nameSet.has(name)) return;
              nameSet.set(name, UsedValueState.Started);
              let c = valueCode(name);
              if (c) {
                const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
                code = code_1._`${code}${def} ${name} = ${c};${this.opts._n}`;
              } else {
                if (!(c = null == getCode ? void 0 : getCode(name))) throw new ValueError(name);
                code = code_1._`${code}${c}${this.opts._n}`;
              }
              nameSet.set(name, UsedValueState.Completed);
            });
          }
          return code;
        }
      };
    },
    '../../../node_modules/ajv/dist/compile/errors.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.extendErrors =
          exports.resetErrorsCount =
          exports.reportExtraError =
          exports.reportError =
          exports.keyword$DataError =
          exports.keywordError =
            void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js');
      function addError(gen, errObj) {
        const err = gen.const('err', errObj);
        gen.if(
          codegen_1._`${names_1.default.vErrors} === null`,
          () => gen.assign(names_1.default.vErrors, codegen_1._`[${err}]`),
          codegen_1._`${names_1.default.vErrors}.push(${err})`,
        ),
          gen.code(codegen_1._`${names_1.default.errors}++`);
      }
      function returnErrors(it, errs) {
        const { gen, validateName, schemaEnv } = it;
        schemaEnv.$async
          ? gen.throw(codegen_1._`new ${it.ValidationError}(${errs})`)
          : (gen.assign(codegen_1._`${validateName}.errors`, errs), gen.return(!1));
      }
      (exports.keywordError = {
        message: ({ keyword }) => codegen_1.str`must pass "${keyword}" keyword validation`,
      }),
        (exports.keyword$DataError = {
          message: ({ keyword, schemaType }) =>
            schemaType
              ? codegen_1.str`"${keyword}" keyword must be ${schemaType} ($data)`
              : codegen_1.str`"${keyword}" keyword is invalid ($data)`,
        }),
        (exports.reportError = function reportError(
          cxt,
          error = exports.keywordError,
          errorPaths,
          overrideAllErrors,
        ) {
          const { it } = cxt,
            { gen, compositeRule, allErrors } = it,
            errObj = errorObjectCode(cxt, error, errorPaths);
          (null != overrideAllErrors ? overrideAllErrors : compositeRule || allErrors)
            ? addError(gen, errObj)
            : returnErrors(it, codegen_1._`[${errObj}]`);
        }),
        (exports.reportExtraError = function reportExtraError(
          cxt,
          error = exports.keywordError,
          errorPaths,
        ) {
          const { it } = cxt,
            { gen, compositeRule, allErrors } = it;
          addError(gen, errorObjectCode(cxt, error, errorPaths)),
            compositeRule || allErrors || returnErrors(it, names_1.default.vErrors);
        }),
        (exports.resetErrorsCount = function resetErrorsCount(gen, errsCount) {
          gen.assign(names_1.default.errors, errsCount),
            gen.if(codegen_1._`${names_1.default.vErrors} !== null`, () =>
              gen.if(
                errsCount,
                () => gen.assign(codegen_1._`${names_1.default.vErrors}.length`, errsCount),
                () => gen.assign(names_1.default.vErrors, null),
              ),
            );
        }),
        (exports.extendErrors = function extendErrors({
          gen,
          keyword,
          schemaValue,
          data,
          errsCount,
          it,
        }) {
          if (void 0 === errsCount) throw new Error('ajv implementation error');
          const err = gen.name('err');
          gen.forRange('i', errsCount, names_1.default.errors, (i) => {
            gen.const(err, codegen_1._`${names_1.default.vErrors}[${i}]`),
              gen.if(codegen_1._`${err}.instancePath === undefined`, () =>
                gen.assign(
                  codegen_1._`${err}.instancePath`,
                  (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath),
                ),
              ),
              gen.assign(
                codegen_1._`${err}.schemaPath`,
                codegen_1.str`${it.errSchemaPath}/${keyword}`,
              ),
              it.opts.verbose &&
                (gen.assign(codegen_1._`${err}.schema`, schemaValue),
                gen.assign(codegen_1._`${err}.data`, data));
          });
        });
      const E = {
        keyword: new codegen_1.Name('keyword'),
        schemaPath: new codegen_1.Name('schemaPath'),
        params: new codegen_1.Name('params'),
        propertyName: new codegen_1.Name('propertyName'),
        message: new codegen_1.Name('message'),
        schema: new codegen_1.Name('schema'),
        parentSchema: new codegen_1.Name('parentSchema'),
      };
      function errorObjectCode(cxt, error, errorPaths) {
        const { createErrors } = cxt.it;
        return !1 === createErrors
          ? codegen_1._`{}`
          : (function errorObject(cxt, error, errorPaths = {}) {
              const { gen, it } = cxt,
                keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
              return (
                (function extraErrorProps(cxt, { params, message }, keyValues) {
                  const { keyword, data, schemaValue, it } = cxt,
                    { opts, propertyName, topSchemaRef, schemaPath } = it;
                  keyValues.push(
                    [E.keyword, keyword],
                    [
                      E.params,
                      'function' == typeof params ? params(cxt) : params || codegen_1._`{}`,
                    ],
                  ),
                    opts.messages &&
                      keyValues.push([
                        E.message,
                        'function' == typeof message ? message(cxt) : message,
                      ]);
                  opts.verbose &&
                    keyValues.push(
                      [E.schema, schemaValue],
                      [E.parentSchema, codegen_1._`${topSchemaRef}${schemaPath}`],
                      [names_1.default.data, data],
                    );
                  propertyName && keyValues.push([E.propertyName, propertyName]);
                })(cxt, error, keyValues),
                gen.object(...keyValues)
              );
            })(cxt, error, errorPaths);
      }
      function errorInstancePath({ errorPath }, { instancePath }) {
        const instPath = instancePath
          ? codegen_1.str`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}`
          : errorPath;
        return [
          names_1.default.instancePath,
          (0, codegen_1.strConcat)(names_1.default.instancePath, instPath),
        ];
      }
      function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
        let schPath = parentSchema ? errSchemaPath : codegen_1.str`${errSchemaPath}/${keyword}`;
        return (
          schemaPath &&
            (schPath = codegen_1.str`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`),
          [E.schemaPath, schPath]
        );
      }
    },
    '../../../node_modules/ajv/dist/compile/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.resolveSchema =
          exports.getCompilingSchema =
          exports.resolveRef =
          exports.compileSchema =
          exports.SchemaEnv =
            void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        validation_error_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/runtime/validation_error.js',
        ),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        resolve_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/resolve.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        validate_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/index.js',
        );
      class SchemaEnv {
        constructor(env) {
          var _a;
          let schema;
          (this.refs = {}),
            (this.dynamicAnchors = {}),
            'object' == typeof env.schema && (schema = env.schema),
            (this.schema = env.schema),
            (this.schemaId = env.schemaId),
            (this.root = env.root || this),
            (this.baseId =
              null !== (_a = env.baseId) && void 0 !== _a
                ? _a
                : (0, resolve_1.normalizeId)(
                    null == schema ? void 0 : schema[env.schemaId || '$id'],
                  )),
            (this.schemaPath = env.schemaPath),
            (this.localRefs = env.localRefs),
            (this.meta = env.meta),
            (this.$async = null == schema ? void 0 : schema.$async),
            (this.refs = {});
        }
      }
      function compileSchema(sch) {
        const _sch = getCompilingSchema.call(this, sch);
        if (_sch) return _sch;
        const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId),
          { es5, lines } = this.opts.code,
          { ownProperties } = this.opts,
          gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
        let _ValidationError;
        sch.$async &&
          (_ValidationError = gen.scopeValue('Error', {
            ref: validation_error_1.default,
            code: codegen_1._`require("ajv/dist/runtime/validation_error").default`,
          }));
        const validateName = gen.scopeName('validate');
        sch.validateName = validateName;
        const schemaCxt = {
          gen,
          allErrors: this.opts.allErrors,
          data: names_1.default.data,
          parentData: names_1.default.parentData,
          parentDataProperty: names_1.default.parentDataProperty,
          dataNames: [names_1.default.data],
          dataPathArr: [codegen_1.nil],
          dataLevel: 0,
          dataTypes: [],
          definedProperties: new Set(),
          topSchemaRef: gen.scopeValue(
            'schema',
            !0 === this.opts.code.source
              ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) }
              : { ref: sch.schema },
          ),
          validateName,
          ValidationError: _ValidationError,
          schema: sch.schema,
          schemaEnv: sch,
          rootId,
          baseId: sch.baseId || rootId,
          schemaPath: codegen_1.nil,
          errSchemaPath: sch.schemaPath || (this.opts.jtd ? '' : '#'),
          errorPath: codegen_1._`""`,
          opts: this.opts,
          self: this,
        };
        let sourceCode;
        try {
          this._compilations.add(sch),
            (0, validate_1.validateFunctionCode)(schemaCxt),
            gen.optimize(this.opts.code.optimize);
          const validateCode = gen.toString();
          (sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`),
            this.opts.code.process && (sourceCode = this.opts.code.process(sourceCode, sch));
          const validate = new Function(
            `${names_1.default.self}`,
            `${names_1.default.scope}`,
            sourceCode,
          )(this, this.scope.get());
          if (
            (this.scope.value(validateName, { ref: validate }),
            (validate.errors = null),
            (validate.schema = sch.schema),
            (validate.schemaEnv = sch),
            sch.$async && (validate.$async = !0),
            !0 === this.opts.code.source &&
              (validate.source = { validateName, validateCode, scopeValues: gen._values }),
            this.opts.unevaluated)
          ) {
            const { props, items } = schemaCxt;
            (validate.evaluated = {
              props: props instanceof codegen_1.Name ? void 0 : props,
              items: items instanceof codegen_1.Name ? void 0 : items,
              dynamicProps: props instanceof codegen_1.Name,
              dynamicItems: items instanceof codegen_1.Name,
            }),
              validate.source &&
                (validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated));
          }
          return (sch.validate = validate), sch;
        } catch (e) {
          throw (
            (delete sch.validate,
            delete sch.validateName,
            sourceCode && this.logger.error('Error compiling schema, function code:', sourceCode),
            e)
          );
        } finally {
          this._compilations.delete(sch);
        }
      }
      function inlineOrCompile(sch) {
        return (0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs)
          ? sch.schema
          : sch.validate
            ? sch
            : compileSchema.call(this, sch);
      }
      function getCompilingSchema(schEnv) {
        for (const sch of this._compilations)
          if (
            ((s2 = schEnv),
            (s1 = sch).schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId)
          )
            return sch;
        var s1, s2;
      }
      function resolve(root, ref) {
        let sch;
        for (; 'string' == typeof (sch = this.refs[ref]); ) ref = sch;
        return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
      }
      function resolveSchema(root, ref) {
        const p = this.opts.uriResolver.parse(ref),
          refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
        let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
        if (Object.keys(root.schema).length > 0 && refPath === baseId)
          return getJsonPointer.call(this, p, root);
        const id = (0, resolve_1.normalizeId)(refPath),
          schOrRef = this.refs[id] || this.schemas[id];
        if ('string' == typeof schOrRef) {
          const sch = resolveSchema.call(this, root, schOrRef);
          if ('object' != typeof (null == sch ? void 0 : sch.schema)) return;
          return getJsonPointer.call(this, p, sch);
        }
        if ('object' == typeof (null == schOrRef ? void 0 : schOrRef.schema)) {
          if (
            (schOrRef.validate || compileSchema.call(this, schOrRef),
            id === (0, resolve_1.normalizeId)(ref))
          ) {
            const { schema } = schOrRef,
              { schemaId } = this.opts,
              schId = schema[schemaId];
            return (
              schId && (baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId)),
              new SchemaEnv({ schema, schemaId, root, baseId })
            );
          }
          return getJsonPointer.call(this, p, schOrRef);
        }
      }
      (exports.SchemaEnv = SchemaEnv),
        (exports.compileSchema = compileSchema),
        (exports.resolveRef = function resolveRef(root, baseId, ref) {
          var _a;
          ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
          const schOrFunc = root.refs[ref];
          if (schOrFunc) return schOrFunc;
          let _sch = resolve.call(this, root, ref);
          if (void 0 === _sch) {
            const schema = null === (_a = root.localRefs) || void 0 === _a ? void 0 : _a[ref],
              { schemaId } = this.opts;
            schema && (_sch = new SchemaEnv({ schema, schemaId, root, baseId }));
          }
          return void 0 !== _sch ? (root.refs[ref] = inlineOrCompile.call(this, _sch)) : void 0;
        }),
        (exports.getCompilingSchema = getCompilingSchema),
        (exports.resolveSchema = resolveSchema);
      const PREVENT_SCOPE_CHANGE = new Set([
        'properties',
        'patternProperties',
        'enum',
        'dependencies',
        'definitions',
      ]);
      function getJsonPointer(parsedRef, { baseId, schema, root }) {
        var _a;
        if ('/' !== (null === (_a = parsedRef.fragment) || void 0 === _a ? void 0 : _a[0])) return;
        for (const part of parsedRef.fragment.slice(1).split('/')) {
          if ('boolean' == typeof schema) return;
          const partSchema = schema[(0, util_1.unescapeFragment)(part)];
          if (void 0 === partSchema) return;
          const schId = 'object' == typeof (schema = partSchema) && schema[this.opts.schemaId];
          !PREVENT_SCOPE_CHANGE.has(part) &&
            schId &&
            (baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId));
        }
        let env;
        if (
          'boolean' != typeof schema &&
          schema.$ref &&
          !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)
        ) {
          const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
          env = resolveSchema.call(this, root, $ref);
        }
        const { schemaId } = this.opts;
        return (
          (env = env || new SchemaEnv({ schema, schemaId, root, baseId })),
          env.schema !== env.root.schema ? env : void 0
        );
      }
    },
    '../../../node_modules/ajv/dist/compile/names.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        names = {
          data: new codegen_1.Name('data'),
          valCxt: new codegen_1.Name('valCxt'),
          instancePath: new codegen_1.Name('instancePath'),
          parentData: new codegen_1.Name('parentData'),
          parentDataProperty: new codegen_1.Name('parentDataProperty'),
          rootData: new codegen_1.Name('rootData'),
          dynamicAnchors: new codegen_1.Name('dynamicAnchors'),
          vErrors: new codegen_1.Name('vErrors'),
          errors: new codegen_1.Name('errors'),
          this: new codegen_1.Name('this'),
          self: new codegen_1.Name('self'),
          scope: new codegen_1.Name('scope'),
          json: new codegen_1.Name('json'),
          jsonPos: new codegen_1.Name('jsonPos'),
          jsonLen: new codegen_1.Name('jsonLen'),
          jsonPart: new codegen_1.Name('jsonPart'),
        };
      exports.default = names;
    },
    '../../../node_modules/ajv/dist/compile/ref_error.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const resolve_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/resolve.js');
      class MissingRefError extends Error {
        constructor(resolver, baseId, ref, msg) {
          super(msg || `can't resolve reference ${ref} from id ${baseId}`),
            (this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref)),
            (this.missingSchema = (0, resolve_1.normalizeId)(
              (0, resolve_1.getFullPath)(resolver, this.missingRef),
            ));
        }
      }
      exports.default = MissingRefError;
    },
    '../../../node_modules/ajv/dist/compile/resolve.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.getSchemaRefs =
          exports.resolveUrl =
          exports.normalizeId =
          exports._getFullPath =
          exports.getFullPath =
          exports.inlineRef =
            void 0);
      const util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        equal = __webpack_require__('../../../node_modules/fast-deep-equal/index.js'),
        traverse = __webpack_require__('../../../node_modules/json-schema-traverse/index.js'),
        SIMPLE_INLINED = new Set([
          'type',
          'format',
          'pattern',
          'maxLength',
          'minLength',
          'maxProperties',
          'minProperties',
          'maxItems',
          'minItems',
          'maximum',
          'minimum',
          'uniqueItems',
          'multipleOf',
          'required',
          'enum',
          'const',
        ]);
      exports.inlineRef = function inlineRef(schema, limit = !0) {
        return (
          'boolean' == typeof schema ||
          (!0 === limit ? !hasRef(schema) : !!limit && countKeys(schema) <= limit)
        );
      };
      const REF_KEYWORDS = new Set([
        '$ref',
        '$recursiveRef',
        '$recursiveAnchor',
        '$dynamicRef',
        '$dynamicAnchor',
      ]);
      function hasRef(schema) {
        for (const key in schema) {
          if (REF_KEYWORDS.has(key)) return !0;
          const sch = schema[key];
          if (Array.isArray(sch) && sch.some(hasRef)) return !0;
          if ('object' == typeof sch && hasRef(sch)) return !0;
        }
        return !1;
      }
      function countKeys(schema) {
        let count = 0;
        for (const key in schema) {
          if ('$ref' === key) return 1 / 0;
          if (
            (count++,
            !SIMPLE_INLINED.has(key) &&
              ('object' == typeof schema[key] &&
                (0, util_1.eachItem)(schema[key], (sch) => (count += countKeys(sch))),
              count === 1 / 0))
          )
            return 1 / 0;
        }
        return count;
      }
      function getFullPath(resolver, id = '', normalize) {
        !1 !== normalize && (id = normalizeId(id));
        const p = resolver.parse(id);
        return _getFullPath(resolver, p);
      }
      function _getFullPath(resolver, p) {
        return resolver.serialize(p).split('#')[0] + '#';
      }
      (exports.getFullPath = getFullPath), (exports._getFullPath = _getFullPath);
      const TRAILING_SLASH_HASH = /#\/?$/;
      function normalizeId(id) {
        return id ? id.replace(TRAILING_SLASH_HASH, '') : '';
      }
      (exports.normalizeId = normalizeId),
        (exports.resolveUrl = function resolveUrl(resolver, baseId, id) {
          return (id = normalizeId(id)), resolver.resolve(baseId, id);
        });
      const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
      exports.getSchemaRefs = function getSchemaRefs(schema, baseId) {
        if ('boolean' == typeof schema) return {};
        const { schemaId, uriResolver } = this.opts,
          schId = normalizeId(schema[schemaId] || baseId),
          baseIds = { '': schId },
          pathPrefix = getFullPath(uriResolver, schId, !1),
          localRefs = {},
          schemaRefs = new Set();
        return (
          traverse(schema, { allKeys: !0 }, (sch, jsonPtr, _, parentJsonPtr) => {
            if (void 0 === parentJsonPtr) return;
            const fullPath = pathPrefix + jsonPtr;
            let innerBaseId = baseIds[parentJsonPtr];
            function addRef(ref) {
              const _resolve = this.opts.uriResolver.resolve;
              if (
                ((ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref)),
                schemaRefs.has(ref))
              )
                throw ambiguos(ref);
              schemaRefs.add(ref);
              let schOrRef = this.refs[ref];
              return (
                'string' == typeof schOrRef && (schOrRef = this.refs[schOrRef]),
                'object' == typeof schOrRef
                  ? checkAmbiguosRef(sch, schOrRef.schema, ref)
                  : ref !== normalizeId(fullPath) &&
                    ('#' === ref[0]
                      ? (checkAmbiguosRef(sch, localRefs[ref], ref), (localRefs[ref] = sch))
                      : (this.refs[ref] = fullPath)),
                ref
              );
            }
            function addAnchor(anchor) {
              if ('string' == typeof anchor) {
                if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`);
                addRef.call(this, `#${anchor}`);
              }
            }
            'string' == typeof sch[schemaId] && (innerBaseId = addRef.call(this, sch[schemaId])),
              addAnchor.call(this, sch.$anchor),
              addAnchor.call(this, sch.$dynamicAnchor),
              (baseIds[jsonPtr] = innerBaseId);
          }),
          localRefs
        );
        function checkAmbiguosRef(sch1, sch2, ref) {
          if (void 0 !== sch2 && !equal(sch1, sch2)) throw ambiguos(ref);
        }
        function ambiguos(ref) {
          return new Error(`reference "${ref}" resolves to more than one schema`);
        }
      };
    },
    '../../../node_modules/ajv/dist/compile/rules.js': (__unused_webpack_module, exports) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.getRules = exports.isJSONType = void 0);
      const jsonTypes = new Set([
        'string',
        'number',
        'integer',
        'boolean',
        'null',
        'object',
        'array',
      ]);
      (exports.isJSONType = function isJSONType(x) {
        return 'string' == typeof x && jsonTypes.has(x);
      }),
        (exports.getRules = function getRules() {
          const groups = {
            number: { type: 'number', rules: [] },
            string: { type: 'string', rules: [] },
            array: { type: 'array', rules: [] },
            object: { type: 'object', rules: [] },
          };
          return {
            types: { ...groups, integer: !0, boolean: !0, null: !0 },
            rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
            post: { rules: [] },
            all: {},
            keywords: {},
          };
        });
    },
    '../../../node_modules/ajv/dist/compile/util.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.checkStrictMode =
          exports.getErrorPath =
          exports.Type =
          exports.useFunc =
          exports.setEvaluated =
          exports.evaluatedPropsToName =
          exports.mergeEvaluated =
          exports.eachItem =
          exports.unescapeJsonPointer =
          exports.escapeJsonPointer =
          exports.escapeFragment =
          exports.unescapeFragment =
          exports.schemaRefOrVal =
          exports.schemaHasRulesButRef =
          exports.schemaHasRules =
          exports.checkUnknownRules =
          exports.alwaysValidSchema =
          exports.toHash =
            void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/code.js');
      function checkUnknownRules(it, schema = it.schema) {
        const { opts, self } = it;
        if (!opts.strictSchema) return;
        if ('boolean' == typeof schema) return;
        const rules = self.RULES.keywords;
        for (const key in schema) rules[key] || checkStrictMode(it, `unknown keyword: "${key}"`);
      }
      function schemaHasRules(schema, rules) {
        if ('boolean' == typeof schema) return !schema;
        for (const key in schema) if (rules[key]) return !0;
        return !1;
      }
      function escapeJsonPointer(str) {
        return 'number' == typeof str ? `${str}` : str.replace(/~/g, '~0').replace(/\//g, '~1');
      }
      function unescapeJsonPointer(str) {
        return str.replace(/~1/g, '/').replace(/~0/g, '~');
      }
      function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
        return (gen, from, to, toName) => {
          const res =
            void 0 === to
              ? from
              : to instanceof codegen_1.Name
                ? (from instanceof codegen_1.Name
                    ? mergeNames(gen, from, to)
                    : mergeToName(gen, from, to),
                  to)
                : from instanceof codegen_1.Name
                  ? (mergeToName(gen, to, from), from)
                  : mergeValues(from, to);
          return toName !== codegen_1.Name || res instanceof codegen_1.Name
            ? res
            : resultToName(gen, res);
        };
      }
      function evaluatedPropsToName(gen, ps) {
        if (!0 === ps) return gen.var('props', !0);
        const props = gen.var('props', codegen_1._`{}`);
        return void 0 !== ps && setEvaluated(gen, props, ps), props;
      }
      function setEvaluated(gen, props, ps) {
        Object.keys(ps).forEach((p) =>
          gen.assign(codegen_1._`${props}${(0, codegen_1.getProperty)(p)}`, !0),
        );
      }
      (exports.toHash = function toHash(arr) {
        const hash = {};
        for (const item of arr) hash[item] = !0;
        return hash;
      }),
        (exports.alwaysValidSchema = function alwaysValidSchema(it, schema) {
          return 'boolean' == typeof schema
            ? schema
            : 0 === Object.keys(schema).length ||
                (checkUnknownRules(it, schema), !schemaHasRules(schema, it.self.RULES.all));
        }),
        (exports.checkUnknownRules = checkUnknownRules),
        (exports.schemaHasRules = schemaHasRules),
        (exports.schemaHasRulesButRef = function schemaHasRulesButRef(schema, RULES) {
          if ('boolean' == typeof schema) return !schema;
          for (const key in schema) if ('$ref' !== key && RULES.all[key]) return !0;
          return !1;
        }),
        (exports.schemaRefOrVal = function schemaRefOrVal(
          { topSchemaRef, schemaPath },
          schema,
          keyword,
          $data,
        ) {
          if (!$data) {
            if ('number' == typeof schema || 'boolean' == typeof schema) return schema;
            if ('string' == typeof schema) return codegen_1._`${schema}`;
          }
          return codegen_1._`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
        }),
        (exports.unescapeFragment = function unescapeFragment(str) {
          return unescapeJsonPointer(decodeURIComponent(str));
        }),
        (exports.escapeFragment = function escapeFragment(str) {
          return encodeURIComponent(escapeJsonPointer(str));
        }),
        (exports.escapeJsonPointer = escapeJsonPointer),
        (exports.unescapeJsonPointer = unescapeJsonPointer),
        (exports.eachItem = function eachItem(xs, f) {
          if (Array.isArray(xs)) for (const x of xs) f(x);
          else f(xs);
        }),
        (exports.mergeEvaluated = {
          props: makeMergeEvaluated({
            mergeNames: (gen, from, to) =>
              gen.if(codegen_1._`${to} !== true && ${from} !== undefined`, () => {
                gen.if(
                  codegen_1._`${from} === true`,
                  () => gen.assign(to, !0),
                  () =>
                    gen
                      .assign(to, codegen_1._`${to} || {}`)
                      .code(codegen_1._`Object.assign(${to}, ${from})`),
                );
              }),
            mergeToName: (gen, from, to) =>
              gen.if(codegen_1._`${to} !== true`, () => {
                !0 === from
                  ? gen.assign(to, !0)
                  : (gen.assign(to, codegen_1._`${to} || {}`), setEvaluated(gen, to, from));
              }),
            mergeValues: (from, to) => !0 === from || { ...from, ...to },
            resultToName: evaluatedPropsToName,
          }),
          items: makeMergeEvaluated({
            mergeNames: (gen, from, to) =>
              gen.if(codegen_1._`${to} !== true && ${from} !== undefined`, () =>
                gen.assign(
                  to,
                  codegen_1._`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`,
                ),
              ),
            mergeToName: (gen, from, to) =>
              gen.if(codegen_1._`${to} !== true`, () =>
                gen.assign(to, !0 === from || codegen_1._`${to} > ${from} ? ${to} : ${from}`),
              ),
            mergeValues: (from, to) => !0 === from || Math.max(from, to),
            resultToName: (gen, items) => gen.var('items', items),
          }),
        }),
        (exports.evaluatedPropsToName = evaluatedPropsToName),
        (exports.setEvaluated = setEvaluated);
      const snippets = {};
      var Type;
      function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
        if (mode) {
          if (((msg = `strict mode: ${msg}`), !0 === mode)) throw new Error(msg);
          it.self.logger.warn(msg);
        }
      }
      (exports.useFunc = function useFunc(gen, f) {
        return gen.scopeValue('func', {
          ref: f,
          code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code)),
        });
      }),
        (function (Type) {
          (Type[(Type.Num = 0)] = 'Num'), (Type[(Type.Str = 1)] = 'Str');
        })(Type || (exports.Type = Type = {})),
        (exports.getErrorPath = function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
          if (dataProp instanceof codegen_1.Name) {
            const isNumber = dataPropType === Type.Num;
            return jsPropertySyntax
              ? isNumber
                ? codegen_1._`"[" + ${dataProp} + "]"`
                : codegen_1._`"['" + ${dataProp} + "']"`
              : isNumber
                ? codegen_1._`"/" + ${dataProp}`
                : codegen_1._`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
          }
          return jsPropertySyntax
            ? (0, codegen_1.getProperty)(dataProp).toString()
            : '/' + escapeJsonPointer(dataProp);
        }),
        (exports.checkStrictMode = checkStrictMode);
    },
    '../../../node_modules/ajv/dist/compile/validate/applicability.js': (
      __unused_webpack_module,
      exports,
    ) => {
      function shouldUseGroup(schema, group) {
        return group.rules.some((rule) => shouldUseRule(schema, rule));
      }
      function shouldUseRule(schema, rule) {
        var _a;
        return (
          void 0 !== schema[rule.keyword] ||
          (null === (_a = rule.definition.implements) || void 0 === _a
            ? void 0
            : _a.some((kwd) => void 0 !== schema[kwd]))
        );
      }
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0),
        (exports.schemaHasRulesForType = function schemaHasRulesForType({ schema, self }, type) {
          const group = self.RULES.types[type];
          return group && !0 !== group && shouldUseGroup(schema, group);
        }),
        (exports.shouldUseGroup = shouldUseGroup),
        (exports.shouldUseRule = shouldUseRule);
    },
    '../../../node_modules/ajv/dist/compile/validate/boolSchema.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0);
      const errors_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/errors.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        boolError = { message: 'boolean schema is false' };
      function falseSchemaError(it, overrideAllErrors) {
        const { gen, data } = it,
          cxt = {
            gen,
            keyword: 'false schema',
            data,
            schema: !1,
            schemaCode: !1,
            schemaValue: !1,
            params: {},
            it,
          };
        (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
      }
      (exports.topBoolOrEmptySchema = function topBoolOrEmptySchema(it) {
        const { gen, schema, validateName } = it;
        !1 === schema
          ? falseSchemaError(it, !1)
          : 'object' == typeof schema && !0 === schema.$async
            ? gen.return(names_1.default.data)
            : (gen.assign(codegen_1._`${validateName}.errors`, null), gen.return(!0));
      }),
        (exports.boolOrEmptySchema = function boolOrEmptySchema(it, valid) {
          const { gen, schema } = it;
          !1 === schema ? (gen.var(valid, !1), falseSchemaError(it)) : gen.var(valid, !0);
        });
    },
    '../../../node_modules/ajv/dist/compile/validate/dataType.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.reportTypeError =
          exports.checkDataTypes =
          exports.checkDataType =
          exports.coerceAndCheckDataType =
          exports.getJSONTypes =
          exports.getSchemaTypes =
          exports.DataType =
            void 0);
      const rules_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/rules.js'),
        applicability_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/applicability.js',
        ),
        errors_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/errors.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js');
      var DataType;
      function getJSONTypes(ts) {
        const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
        if (types.every(rules_1.isJSONType)) return types;
        throw new Error('type must be JSONType or JSONType[]: ' + types.join(','));
      }
      !(function (DataType) {
        (DataType[(DataType.Correct = 0)] = 'Correct'), (DataType[(DataType.Wrong = 1)] = 'Wrong');
      })(DataType || (exports.DataType = DataType = {})),
        (exports.getSchemaTypes = function getSchemaTypes(schema) {
          const types = getJSONTypes(schema.type);
          if (types.includes('null')) {
            if (!1 === schema.nullable) throw new Error('type: null contradicts nullable: false');
          } else {
            if (!types.length && void 0 !== schema.nullable)
              throw new Error('"nullable" cannot be used without "type"');
            !0 === schema.nullable && types.push('null');
          }
          return types;
        }),
        (exports.getJSONTypes = getJSONTypes),
        (exports.coerceAndCheckDataType = function coerceAndCheckDataType(it, types) {
          const { gen, data, opts } = it,
            coerceTo = (function coerceToTypes(types, coerceTypes) {
              return coerceTypes
                ? types.filter(
                    (t) => COERCIBLE.has(t) || ('array' === coerceTypes && 'array' === t),
                  )
                : [];
            })(types, opts.coerceTypes),
            checkTypes =
              types.length > 0 &&
              !(
                0 === coerceTo.length &&
                1 === types.length &&
                (0, applicability_1.schemaHasRulesForType)(it, types[0])
              );
          if (checkTypes) {
            const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
            gen.if(wrongType, () => {
              coerceTo.length
                ? (function coerceData(it, types, coerceTo) {
                    const { gen, data, opts } = it,
                      dataType = gen.let('dataType', codegen_1._`typeof ${data}`),
                      coerced = gen.let('coerced', codegen_1._`undefined`);
                    'array' === opts.coerceTypes &&
                      gen.if(
                        codegen_1._`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`,
                        () =>
                          gen
                            .assign(data, codegen_1._`${data}[0]`)
                            .assign(dataType, codegen_1._`typeof ${data}`)
                            .if(checkDataTypes(types, data, opts.strictNumbers), () =>
                              gen.assign(coerced, data),
                            ),
                      );
                    gen.if(codegen_1._`${coerced} !== undefined`);
                    for (const t of coerceTo)
                      (COERCIBLE.has(t) || ('array' === t && 'array' === opts.coerceTypes)) &&
                        coerceSpecificType(t);
                    function coerceSpecificType(t) {
                      switch (t) {
                        case 'string':
                          return void gen
                            .elseIf(
                              codegen_1._`${dataType} == "number" || ${dataType} == "boolean"`,
                            )
                            .assign(coerced, codegen_1._`"" + ${data}`)
                            .elseIf(codegen_1._`${data} === null`)
                            .assign(coerced, codegen_1._`""`);
                        case 'number':
                          return void gen
                            .elseIf(
                              codegen_1._`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`,
                            )
                            .assign(coerced, codegen_1._`+${data}`);
                        case 'integer':
                          return void gen
                            .elseIf(
                              codegen_1._`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`,
                            )
                            .assign(coerced, codegen_1._`+${data}`);
                        case 'boolean':
                          return void gen
                            .elseIf(
                              codegen_1._`${data} === "false" || ${data} === 0 || ${data} === null`,
                            )
                            .assign(coerced, !1)
                            .elseIf(codegen_1._`${data} === "true" || ${data} === 1`)
                            .assign(coerced, !0);
                        case 'null':
                          return (
                            gen.elseIf(
                              codegen_1._`${data} === "" || ${data} === 0 || ${data} === false`,
                            ),
                            void gen.assign(coerced, null)
                          );
                        case 'array':
                          gen
                            .elseIf(
                              codegen_1._`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`,
                            )
                            .assign(coerced, codegen_1._`[${data}]`);
                      }
                    }
                    gen.else(),
                      reportTypeError(it),
                      gen.endIf(),
                      gen.if(codegen_1._`${coerced} !== undefined`, () => {
                        gen.assign(data, coerced),
                          (function assignParentData(
                            { gen, parentData, parentDataProperty },
                            expr,
                          ) {
                            gen.if(codegen_1._`${parentData} !== undefined`, () =>
                              gen.assign(codegen_1._`${parentData}[${parentDataProperty}]`, expr),
                            );
                          })(it, coerced);
                      });
                  })(it, types, coerceTo)
                : reportTypeError(it);
            });
          }
          return checkTypes;
        });
      const COERCIBLE = new Set(['string', 'number', 'integer', 'boolean', 'null']);
      function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
        const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
        let cond;
        switch (dataType) {
          case 'null':
            return codegen_1._`${data} ${EQ} null`;
          case 'array':
            cond = codegen_1._`Array.isArray(${data})`;
            break;
          case 'object':
            cond = codegen_1._`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
            break;
          case 'integer':
            cond = numCond(codegen_1._`!(${data} % 1) && !isNaN(${data})`);
            break;
          case 'number':
            cond = numCond();
            break;
          default:
            return codegen_1._`typeof ${data} ${EQ} ${dataType}`;
        }
        return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
        function numCond(_cond = codegen_1.nil) {
          return (0, codegen_1.and)(
            codegen_1._`typeof ${data} == "number"`,
            _cond,
            strictNums ? codegen_1._`isFinite(${data})` : codegen_1.nil,
          );
        }
      }
      function checkDataTypes(dataTypes, data, strictNums, correct) {
        if (1 === dataTypes.length) return checkDataType(dataTypes[0], data, strictNums, correct);
        let cond;
        const types = (0, util_1.toHash)(dataTypes);
        if (types.array && types.object) {
          const notObj = codegen_1._`typeof ${data} != "object"`;
          (cond = types.null ? notObj : codegen_1._`!${data} || ${notObj}`),
            delete types.null,
            delete types.array,
            delete types.object;
        } else cond = codegen_1.nil;
        types.number && delete types.integer;
        for (const t in types)
          cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
        return cond;
      }
      (exports.checkDataType = checkDataType), (exports.checkDataTypes = checkDataTypes);
      const typeError = {
        message: ({ schema }) => `must be ${schema}`,
        params: ({ schema, schemaValue }) =>
          'string' == typeof schema
            ? codegen_1._`{type: ${schema}}`
            : codegen_1._`{type: ${schemaValue}}`,
      };
      function reportTypeError(it) {
        const cxt = (function getTypeErrorContext(it) {
          const { gen, data, schema } = it,
            schemaCode = (0, util_1.schemaRefOrVal)(it, schema, 'type');
          return {
            gen,
            keyword: 'type',
            data,
            schema: schema.type,
            schemaCode,
            schemaValue: schemaCode,
            parentSchema: schema,
            params: {},
            it,
          };
        })(it);
        (0, errors_1.reportError)(cxt, typeError);
      }
      exports.reportTypeError = reportTypeError;
    },
    '../../../node_modules/ajv/dist/compile/validate/defaults.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.assignDefaults = void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js');
      function assignDefault(it, prop, defaultValue) {
        const { gen, compositeRule, data, opts } = it;
        if (void 0 === defaultValue) return;
        const childData = codegen_1._`${data}${(0, codegen_1.getProperty)(prop)}`;
        if (compositeRule)
          return void (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        let condition = codegen_1._`${childData} === undefined`;
        'empty' === opts.useDefaults &&
          (condition = codegen_1._`${condition} || ${childData} === null || ${childData} === ""`),
          gen.if(condition, codegen_1._`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
      }
      exports.assignDefaults = function assignDefaults(it, ty) {
        const { properties, items } = it.schema;
        if ('object' === ty && properties)
          for (const key in properties) assignDefault(it, key, properties[key].default);
        else
          'array' === ty &&
            Array.isArray(items) &&
            items.forEach((sch, i) => assignDefault(it, i, sch.default));
      };
    },
    '../../../node_modules/ajv/dist/compile/validate/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0);
      const boolSchema_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/boolSchema.js',
        ),
        dataType_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/dataType.js',
        ),
        applicability_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/applicability.js',
        ),
        dataType_2 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/dataType.js',
        ),
        defaults_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/defaults.js',
        ),
        keyword_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/keyword.js',
        ),
        subschema_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/subschema.js',
        ),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        resolve_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/resolve.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        errors_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/errors.js');
      function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
        opts.code.es5
          ? gen.func(
              validateName,
              codegen_1._`${names_1.default.data}, ${names_1.default.valCxt}`,
              schemaEnv.$async,
              () => {
                gen.code(codegen_1._`"use strict"; ${funcSourceUrl(schema, opts)}`),
                  (function destructureValCxtES5(gen, opts) {
                    gen.if(
                      names_1.default.valCxt,
                      () => {
                        gen.var(
                          names_1.default.instancePath,
                          codegen_1._`${names_1.default.valCxt}.${names_1.default.instancePath}`,
                        ),
                          gen.var(
                            names_1.default.parentData,
                            codegen_1._`${names_1.default.valCxt}.${names_1.default.parentData}`,
                          ),
                          gen.var(
                            names_1.default.parentDataProperty,
                            codegen_1._`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`,
                          ),
                          gen.var(
                            names_1.default.rootData,
                            codegen_1._`${names_1.default.valCxt}.${names_1.default.rootData}`,
                          ),
                          opts.dynamicRef &&
                            gen.var(
                              names_1.default.dynamicAnchors,
                              codegen_1._`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`,
                            );
                      },
                      () => {
                        gen.var(names_1.default.instancePath, codegen_1._`""`),
                          gen.var(names_1.default.parentData, codegen_1._`undefined`),
                          gen.var(names_1.default.parentDataProperty, codegen_1._`undefined`),
                          gen.var(names_1.default.rootData, names_1.default.data),
                          opts.dynamicRef &&
                            gen.var(names_1.default.dynamicAnchors, codegen_1._`{}`);
                      },
                    );
                  })(gen, opts),
                  gen.code(body);
              },
            )
          : gen.func(
              validateName,
              codegen_1._`${names_1.default.data}, ${(function destructureValCxt(opts) {
                return codegen_1._`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? codegen_1._`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
              })(opts)}`,
              schemaEnv.$async,
              () => gen.code(funcSourceUrl(schema, opts)).code(body),
            );
      }
      function funcSourceUrl(schema, opts) {
        const schId = 'object' == typeof schema && schema[opts.schemaId];
        return schId && (opts.code.source || opts.code.process)
          ? codegen_1._`/*# sourceURL=${schId} */`
          : codegen_1.nil;
      }
      function subschemaCode(it, valid) {
        isSchemaObj(it) && (checkKeywords(it), schemaCxtHasRules(it))
          ? (function subSchemaObjCode(it, valid) {
              const { schema, gen, opts } = it;
              opts.$comment && schema.$comment && commentKeyword(it);
              (function updateContext(it) {
                const schId = it.schema[it.opts.schemaId];
                schId &&
                  (it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId));
              })(it),
                (function checkAsyncSchema(it) {
                  if (it.schema.$async && !it.schemaEnv.$async)
                    throw new Error('async schema in sync schema');
                })(it);
              const errsCount = gen.const('_errs', names_1.default.errors);
              typeAndKeywords(it, errsCount),
                gen.var(valid, codegen_1._`${errsCount} === ${names_1.default.errors}`);
            })(it, valid)
          : (0, boolSchema_1.boolOrEmptySchema)(it, valid);
      }
      function schemaCxtHasRules({ schema, self }) {
        if ('boolean' == typeof schema) return !schema;
        for (const key in schema) if (self.RULES.all[key]) return !0;
        return !1;
      }
      function isSchemaObj(it) {
        return 'boolean' != typeof it.schema;
      }
      function checkKeywords(it) {
        (0, util_1.checkUnknownRules)(it),
          (function checkRefsAndKeywords(it) {
            const { schema, errSchemaPath, opts, self } = it;
            schema.$ref &&
              opts.ignoreKeywordsWithRef &&
              (0, util_1.schemaHasRulesButRef)(schema, self.RULES) &&
              self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
          })(it);
      }
      function typeAndKeywords(it, errsCount) {
        if (it.opts.jtd) return schemaKeywords(it, [], !1, errsCount);
        const types = (0, dataType_1.getSchemaTypes)(it.schema);
        schemaKeywords(it, types, !(0, dataType_1.coerceAndCheckDataType)(it, types), errsCount);
      }
      function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
        const msg = schema.$comment;
        if (!0 === opts.$comment) gen.code(codegen_1._`${names_1.default.self}.logger.log(${msg})`);
        else if ('function' == typeof opts.$comment) {
          const schemaPath = codegen_1.str`${errSchemaPath}/$comment`,
            rootName = gen.scopeValue('root', { ref: schemaEnv.root });
          gen.code(
            codegen_1._`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`,
          );
        }
      }
      function schemaKeywords(it, types, typeErrors, errsCount) {
        const { gen, schema, data, allErrors, opts, self } = it,
          { RULES } = self;
        function groupKeywords(group) {
          (0, applicability_1.shouldUseGroup)(schema, group) &&
            (group.type
              ? (gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers)),
                iterateKeywords(it, group),
                1 === types.length &&
                  types[0] === group.type &&
                  typeErrors &&
                  (gen.else(), (0, dataType_2.reportTypeError)(it)),
                gen.endIf())
              : iterateKeywords(it, group),
            allErrors || gen.if(codegen_1._`${names_1.default.errors} === ${errsCount || 0}`));
        }
        !schema.$ref ||
        (!opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, RULES))
          ? (opts.jtd ||
              (function checkStrictTypes(it, types) {
                if (it.schemaEnv.meta || !it.opts.strictTypes) return;
                (function checkContextTypes(it, types) {
                  if (!types.length) return;
                  if (!it.dataTypes.length) return void (it.dataTypes = types);
                  types.forEach((t) => {
                    includesType(it.dataTypes, t) ||
                      strictTypesError(
                        it,
                        `type "${t}" not allowed by context "${it.dataTypes.join(',')}"`,
                      );
                  }),
                    (function narrowSchemaTypes(it, withTypes) {
                      const ts = [];
                      for (const t of it.dataTypes)
                        includesType(withTypes, t)
                          ? ts.push(t)
                          : withTypes.includes('integer') && 'number' === t && ts.push('integer');
                      it.dataTypes = ts;
                    })(it, types);
                })(it, types),
                  it.opts.allowUnionTypes ||
                    (function checkMultipleTypes(it, ts) {
                      ts.length > 1 &&
                        (2 !== ts.length || !ts.includes('null')) &&
                        strictTypesError(it, 'use allowUnionTypes to allow union type keyword');
                    })(it, types);
                !(function checkKeywordTypes(it, ts) {
                  const rules = it.self.RULES.all;
                  for (const keyword in rules) {
                    const rule = rules[keyword];
                    if (
                      'object' == typeof rule &&
                      (0, applicability_1.shouldUseRule)(it.schema, rule)
                    ) {
                      const { type } = rule.definition;
                      type.length &&
                        !type.some((t) => hasApplicableType(ts, t)) &&
                        strictTypesError(
                          it,
                          `missing type "${type.join(',')}" for keyword "${keyword}"`,
                        );
                    }
                  }
                })(it, it.dataTypes);
              })(it, types),
            gen.block(() => {
              for (const group of RULES.rules) groupKeywords(group);
              groupKeywords(RULES.post);
            }))
          : gen.block(() => keywordCode(it, '$ref', RULES.all.$ref.definition));
      }
      function iterateKeywords(it, group) {
        const {
          gen,
          schema,
          opts: { useDefaults },
        } = it;
        useDefaults && (0, defaults_1.assignDefaults)(it, group.type),
          gen.block(() => {
            for (const rule of group.rules)
              (0, applicability_1.shouldUseRule)(schema, rule) &&
                keywordCode(it, rule.keyword, rule.definition, group.type);
          });
      }
      function hasApplicableType(schTs, kwdT) {
        return schTs.includes(kwdT) || ('number' === kwdT && schTs.includes('integer'));
      }
      function includesType(ts, t) {
        return ts.includes(t) || ('integer' === t && ts.includes('number'));
      }
      function strictTypesError(it, msg) {
        (msg += ` at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictTypes)`),
          (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
      }
      exports.validateFunctionCode = function validateFunctionCode(it) {
        isSchemaObj(it) && (checkKeywords(it), schemaCxtHasRules(it))
          ? (function topSchemaObjCode(it) {
              const { schema, opts, gen } = it;
              return void validateFunction(it, () => {
                opts.$comment && schema.$comment && commentKeyword(it),
                  (function checkNoDefault(it) {
                    const { schema, opts } = it;
                    void 0 !== schema.default &&
                      opts.useDefaults &&
                      opts.strictSchema &&
                      (0, util_1.checkStrictMode)(it, 'default is ignored in the schema root');
                  })(it),
                  gen.let(names_1.default.vErrors, null),
                  gen.let(names_1.default.errors, 0),
                  opts.unevaluated &&
                    (function resetEvaluated(it) {
                      const { gen, validateName } = it;
                      (it.evaluated = gen.const(
                        'evaluated',
                        codegen_1._`${validateName}.evaluated`,
                      )),
                        gen.if(codegen_1._`${it.evaluated}.dynamicProps`, () =>
                          gen.assign(codegen_1._`${it.evaluated}.props`, codegen_1._`undefined`),
                        ),
                        gen.if(codegen_1._`${it.evaluated}.dynamicItems`, () =>
                          gen.assign(codegen_1._`${it.evaluated}.items`, codegen_1._`undefined`),
                        );
                    })(it),
                  typeAndKeywords(it),
                  (function returnResults(it) {
                    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
                    schemaEnv.$async
                      ? gen.if(
                          codegen_1._`${names_1.default.errors} === 0`,
                          () => gen.return(names_1.default.data),
                          () =>
                            gen.throw(
                              codegen_1._`new ${ValidationError}(${names_1.default.vErrors})`,
                            ),
                        )
                      : (gen.assign(codegen_1._`${validateName}.errors`, names_1.default.vErrors),
                        opts.unevaluated &&
                          (function assignEvaluated({ gen, evaluated, props, items }) {
                            props instanceof codegen_1.Name &&
                              gen.assign(codegen_1._`${evaluated}.props`, props);
                            items instanceof codegen_1.Name &&
                              gen.assign(codegen_1._`${evaluated}.items`, items);
                          })(it),
                        gen.return(codegen_1._`${names_1.default.errors} === 0`));
                  })(it);
              });
            })(it)
          : validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
      };
      class KeywordCxt {
        constructor(it, def, keyword) {
          if (
            ((0, keyword_1.validateKeywordUsage)(it, def, keyword),
            (this.gen = it.gen),
            (this.allErrors = it.allErrors),
            (this.keyword = keyword),
            (this.data = it.data),
            (this.schema = it.schema[keyword]),
            (this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data),
            (this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data)),
            (this.schemaType = def.schemaType),
            (this.parentSchema = it.schema),
            (this.params = {}),
            (this.it = it),
            (this.def = def),
            this.$data)
          )
            this.schemaCode = it.gen.const('vSchema', getData(this.$data, it));
          else if (
            ((this.schemaCode = this.schemaValue),
            !(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined))
          )
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          ('code' in def ? def.trackErrors : !1 !== def.errors) &&
            (this.errsCount = it.gen.const('_errs', names_1.default.errors));
        }
        result(condition, successAction, failAction) {
          this.failResult((0, codegen_1.not)(condition), successAction, failAction);
        }
        failResult(condition, successAction, failAction) {
          this.gen.if(condition),
            failAction ? failAction() : this.error(),
            successAction
              ? (this.gen.else(), successAction(), this.allErrors && this.gen.endIf())
              : this.allErrors
                ? this.gen.endIf()
                : this.gen.else();
        }
        pass(condition, failAction) {
          this.failResult((0, codegen_1.not)(condition), void 0, failAction);
        }
        fail(condition) {
          if (void 0 === condition) return this.error(), void (this.allErrors || this.gen.if(!1));
          this.gen.if(condition), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
        }
        fail$data(condition) {
          if (!this.$data) return this.fail(condition);
          const { schemaCode } = this;
          this.fail(
            codegen_1._`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`,
          );
        }
        error(append, errorParams, errorPaths) {
          if (errorParams)
            return (
              this.setParams(errorParams), this._error(append, errorPaths), void this.setParams({})
            );
          this._error(append, errorPaths);
        }
        _error(append, errorPaths) {
          (append ? errors_1.reportExtraError : errors_1.reportError)(
            this,
            this.def.error,
            errorPaths,
          );
        }
        $dataError() {
          (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
        }
        reset() {
          if (void 0 === this.errsCount) throw new Error('add "trackErrors" to keyword definition');
          (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
        }
        ok(cond) {
          this.allErrors || this.gen.if(cond);
        }
        setParams(obj, assign) {
          assign ? Object.assign(this.params, obj) : (this.params = obj);
        }
        block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
          this.gen.block(() => {
            this.check$data(valid, $dataValid), codeBlock();
          });
        }
        check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
          if (!this.$data) return;
          const { gen, schemaCode, schemaType, def } = this;
          gen.if((0, codegen_1.or)(codegen_1._`${schemaCode} === undefined`, $dataValid)),
            valid !== codegen_1.nil && gen.assign(valid, !0),
            (schemaType.length || def.validateSchema) &&
              (gen.elseIf(this.invalid$data()),
              this.$dataError(),
              valid !== codegen_1.nil && gen.assign(valid, !1)),
            gen.else();
        }
        invalid$data() {
          const { gen, schemaCode, schemaType, def, it } = this;
          return (0, codegen_1.or)(
            (function wrong$DataType() {
              if (schemaType.length) {
                if (!(schemaCode instanceof codegen_1.Name))
                  throw new Error('ajv implementation error');
                const st = Array.isArray(schemaType) ? schemaType : [schemaType];
                return codegen_1._`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
              }
              return codegen_1.nil;
            })(),
            (function invalid$DataSchema() {
              if (def.validateSchema) {
                const validateSchemaRef = gen.scopeValue('validate$data', {
                  ref: def.validateSchema,
                });
                return codegen_1._`!${validateSchemaRef}(${schemaCode})`;
              }
              return codegen_1.nil;
            })(),
          );
        }
        subschema(appl, valid) {
          const subschema = (0, subschema_1.getSubschema)(this.it, appl);
          (0, subschema_1.extendSubschemaData)(subschema, this.it, appl),
            (0, subschema_1.extendSubschemaMode)(subschema, appl);
          const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
          return subschemaCode(nextContext, valid), nextContext;
        }
        mergeEvaluated(schemaCxt, toName) {
          const { it, gen } = this;
          it.opts.unevaluated &&
            (!0 !== it.props &&
              void 0 !== schemaCxt.props &&
              (it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName)),
            !0 !== it.items &&
              void 0 !== schemaCxt.items &&
              (it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName)));
        }
        mergeValidEvaluated(schemaCxt, valid) {
          const { it, gen } = this;
          if (it.opts.unevaluated && (!0 !== it.props || !0 !== it.items))
            return gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name)), !0;
        }
      }
      function keywordCode(it, keyword, def, ruleType) {
        const cxt = new KeywordCxt(it, def, keyword);
        'code' in def
          ? def.code(cxt, ruleType)
          : cxt.$data && def.validate
            ? (0, keyword_1.funcKeywordCode)(cxt, def)
            : 'macro' in def
              ? (0, keyword_1.macroKeywordCode)(cxt, def)
              : (def.compile || def.validate) && (0, keyword_1.funcKeywordCode)(cxt, def);
      }
      exports.KeywordCxt = KeywordCxt;
      const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/,
        RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
      function getData($data, { dataLevel, dataNames, dataPathArr }) {
        let jsonPointer, data;
        if ('' === $data) return names_1.default.rootData;
        if ('/' === $data[0]) {
          if (!JSON_POINTER.test($data)) throw new Error(`Invalid JSON-pointer: ${$data}`);
          (jsonPointer = $data), (data = names_1.default.rootData);
        } else {
          const matches = RELATIVE_JSON_POINTER.exec($data);
          if (!matches) throw new Error(`Invalid JSON-pointer: ${$data}`);
          const up = +matches[1];
          if (((jsonPointer = matches[2]), '#' === jsonPointer)) {
            if (up >= dataLevel) throw new Error(errorMsg('property/index', up));
            return dataPathArr[dataLevel - up];
          }
          if (up > dataLevel) throw new Error(errorMsg('data', up));
          if (((data = dataNames[dataLevel - up]), !jsonPointer)) return data;
        }
        let expr = data;
        const segments = jsonPointer.split('/');
        for (const segment of segments)
          segment &&
            ((data = codegen_1._`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`),
            (expr = codegen_1._`${expr} && ${data}`));
        return expr;
        function errorMsg(pointerType, up) {
          return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
        }
      }
      exports.getData = getData;
    },
    '../../../node_modules/ajv/dist/compile/validate/keyword.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.validateKeywordUsage =
          exports.validSchemaType =
          exports.funcKeywordCode =
          exports.macroKeywordCode =
            void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        errors_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/errors.js');
      function modifyData(cxt) {
        const { gen, data, it } = cxt;
        gen.if(it.parentData, () =>
          gen.assign(data, codegen_1._`${it.parentData}[${it.parentDataProperty}]`),
        );
      }
      function useKeyword(gen, keyword, result) {
        if (void 0 === result) throw new Error(`keyword "${keyword}" failed to compile`);
        return gen.scopeValue(
          'keyword',
          'function' == typeof result
            ? { ref: result }
            : { ref: result, code: (0, codegen_1.stringify)(result) },
        );
      }
      (exports.macroKeywordCode = function macroKeywordCode(cxt, def) {
        const { gen, keyword, schema, parentSchema, it } = cxt,
          macroSchema = def.macro.call(it.self, schema, parentSchema, it),
          schemaRef = useKeyword(gen, keyword, macroSchema);
        !1 !== it.opts.validateSchema && it.self.validateSchema(macroSchema, !0);
        const valid = gen.name('valid');
        cxt.subschema(
          {
            schema: macroSchema,
            schemaPath: codegen_1.nil,
            errSchemaPath: `${it.errSchemaPath}/${keyword}`,
            topSchemaRef: schemaRef,
            compositeRule: !0,
          },
          valid,
        ),
          cxt.pass(valid, () => cxt.error(!0));
      }),
        (exports.funcKeywordCode = function funcKeywordCode(cxt, def) {
          var _a;
          const { gen, keyword, schema, parentSchema, $data, it } = cxt;
          !(function checkAsyncKeyword({ schemaEnv }, def) {
            if (def.async && !schemaEnv.$async) throw new Error('async keyword in sync schema');
          })(it, def);
          const validate =
              !$data && def.compile
                ? def.compile.call(it.self, schema, parentSchema, it)
                : def.validate,
            validateRef = useKeyword(gen, keyword, validate),
            valid = gen.let('valid');
          function assignValid(_await = def.async ? codegen_1._`await ` : codegen_1.nil) {
            const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self,
              passSchema = !(('compile' in def && !$data) || !1 === def.schema);
            gen.assign(
              valid,
              codegen_1._`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`,
              def.modifying,
            );
          }
          function reportErrs(errors) {
            var _a;
            gen.if(
              (0, codegen_1.not)(null !== (_a = def.valid) && void 0 !== _a ? _a : valid),
              errors,
            );
          }
          cxt.block$data(valid, function validateKeyword() {
            if (!1 === def.errors)
              assignValid(), def.modifying && modifyData(cxt), reportErrs(() => cxt.error());
            else {
              const ruleErrs = def.async
                ? (function validateAsync() {
                    const ruleErrs = gen.let('ruleErrs', null);
                    return (
                      gen.try(
                        () => assignValid(codegen_1._`await `),
                        (e) =>
                          gen.assign(valid, !1).if(
                            codegen_1._`${e} instanceof ${it.ValidationError}`,
                            () => gen.assign(ruleErrs, codegen_1._`${e}.errors`),
                            () => gen.throw(e),
                          ),
                      ),
                      ruleErrs
                    );
                  })()
                : (function validateSync() {
                    const validateErrs = codegen_1._`${validateRef}.errors`;
                    return gen.assign(validateErrs, null), assignValid(codegen_1.nil), validateErrs;
                  })();
              def.modifying && modifyData(cxt),
                reportErrs(() =>
                  (function addErrs(cxt, errs) {
                    const { gen } = cxt;
                    gen.if(
                      codegen_1._`Array.isArray(${errs})`,
                      () => {
                        gen
                          .assign(
                            names_1.default.vErrors,
                            codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
                          )
                          .assign(
                            names_1.default.errors,
                            codegen_1._`${names_1.default.vErrors}.length`,
                          ),
                          (0, errors_1.extendErrors)(cxt);
                      },
                      () => cxt.error(),
                    );
                  })(cxt, ruleErrs),
                );
            }
          }),
            cxt.ok(null !== (_a = def.valid) && void 0 !== _a ? _a : valid);
        }),
        (exports.validSchemaType = function validSchemaType(
          schema,
          schemaType,
          allowUndefined = !1,
        ) {
          return (
            !schemaType.length ||
            schemaType.some((st) =>
              'array' === st
                ? Array.isArray(schema)
                : 'object' === st
                  ? schema && 'object' == typeof schema && !Array.isArray(schema)
                  : typeof schema == st || (allowUndefined && void 0 === schema),
            )
          );
        }),
        (exports.validateKeywordUsage = function validateKeywordUsage(
          { schema, opts, self, errSchemaPath },
          def,
          keyword,
        ) {
          if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword)
            throw new Error('ajv implementation error');
          const deps = def.dependencies;
          if (
            null == deps
              ? void 0
              : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))
          )
            throw new Error(
              `parent schema must have dependencies of ${keyword}: ${deps.join(',')}`,
            );
          if (def.validateSchema) {
            if (!def.validateSchema(schema[keyword])) {
              const msg =
                `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
                self.errorsText(def.validateSchema.errors);
              if ('log' !== opts.validateSchema) throw new Error(msg);
              self.logger.error(msg);
            }
          }
        });
    },
    '../../../node_modules/ajv/dist/compile/validate/subschema.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js');
      (exports.getSubschema = function getSubschema(
        it,
        { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef },
      ) {
        if (void 0 !== keyword && void 0 !== schema)
          throw new Error('both "keyword" and "schema" passed, only one allowed');
        if (void 0 !== keyword) {
          const sch = it.schema[keyword];
          return void 0 === schemaProp
            ? {
                schema: sch,
                schemaPath: codegen_1._`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
                errSchemaPath: `${it.errSchemaPath}/${keyword}`,
              }
            : {
                schema: sch[schemaProp],
                schemaPath: codegen_1._`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
                errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`,
              };
        }
        if (void 0 !== schema) {
          if (void 0 === schemaPath || void 0 === errSchemaPath || void 0 === topSchemaRef)
            throw new Error(
              '"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"',
            );
          return { schema, schemaPath, topSchemaRef, errSchemaPath };
        }
        throw new Error('either "keyword" or "schema" must be passed');
      }),
        (exports.extendSubschemaData = function extendSubschemaData(
          subschema,
          it,
          { dataProp, dataPropType: dpType, data, dataTypes, propertyName },
        ) {
          if (void 0 !== data && void 0 !== dataProp)
            throw new Error('both "data" and "dataProp" passed, only one allowed');
          const { gen } = it;
          if (void 0 !== dataProp) {
            const { errorPath, dataPathArr, opts } = it;
            dataContextProps(
              gen.let('data', codegen_1._`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, !0),
            ),
              (subschema.errorPath = codegen_1.str`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`),
              (subschema.parentDataProperty = codegen_1._`${dataProp}`),
              (subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty]);
          }
          if (void 0 !== data) {
            dataContextProps(data instanceof codegen_1.Name ? data : gen.let('data', data, !0)),
              void 0 !== propertyName && (subschema.propertyName = propertyName);
          }
          function dataContextProps(_nextData) {
            (subschema.data = _nextData),
              (subschema.dataLevel = it.dataLevel + 1),
              (subschema.dataTypes = []),
              (it.definedProperties = new Set()),
              (subschema.parentData = it.data),
              (subschema.dataNames = [...it.dataNames, _nextData]);
          }
          dataTypes && (subschema.dataTypes = dataTypes);
        }),
        (exports.extendSubschemaMode = function extendSubschemaMode(
          subschema,
          { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors },
        ) {
          void 0 !== compositeRule && (subschema.compositeRule = compositeRule),
            void 0 !== createErrors && (subschema.createErrors = createErrors),
            void 0 !== allErrors && (subschema.allErrors = allErrors),
            (subschema.jtdDiscriminator = jtdDiscriminator),
            (subschema.jtdMetadata = jtdMetadata);
        });
    },
    '../../../node_modules/ajv/dist/core.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.CodeGen =
          exports.Name =
          exports.nil =
          exports.stringify =
          exports.str =
          exports._ =
          exports.KeywordCxt =
            void 0);
      var validate_1 = __webpack_require__(
        '../../../node_modules/ajv/dist/compile/validate/index.js',
      );
      Object.defineProperty(exports, 'KeywordCxt', {
        enumerable: !0,
        get: function () {
          return validate_1.KeywordCxt;
        },
      });
      var codegen_1 = __webpack_require__(
        '../../../node_modules/ajv/dist/compile/codegen/index.js',
      );
      Object.defineProperty(exports, '_', {
        enumerable: !0,
        get: function () {
          return codegen_1._;
        },
      }),
        Object.defineProperty(exports, 'str', {
          enumerable: !0,
          get: function () {
            return codegen_1.str;
          },
        }),
        Object.defineProperty(exports, 'stringify', {
          enumerable: !0,
          get: function () {
            return codegen_1.stringify;
          },
        }),
        Object.defineProperty(exports, 'nil', {
          enumerable: !0,
          get: function () {
            return codegen_1.nil;
          },
        }),
        Object.defineProperty(exports, 'Name', {
          enumerable: !0,
          get: function () {
            return codegen_1.Name;
          },
        }),
        Object.defineProperty(exports, 'CodeGen', {
          enumerable: !0,
          get: function () {
            return codegen_1.CodeGen;
          },
        });
      const validation_error_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/runtime/validation_error.js',
        ),
        ref_error_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/ref_error.js'),
        rules_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/rules.js'),
        compile_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/index.js'),
        codegen_2 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        resolve_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/resolve.js'),
        dataType_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/dataType.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        $dataRefSchema = __webpack_require__('../../../node_modules/ajv/dist/refs/data.json'),
        uri_1 = __webpack_require__('../../../node_modules/ajv/dist/runtime/uri.js'),
        defaultRegExp = (str, flags) => new RegExp(str, flags);
      defaultRegExp.code = 'new RegExp';
      const META_IGNORE_OPTIONS = ['removeAdditional', 'useDefaults', 'coerceTypes'],
        EXT_SCOPE_NAMES = new Set([
          'validate',
          'serialize',
          'parse',
          'wrapper',
          'root',
          'schema',
          'keyword',
          'pattern',
          'formats',
          'validate$data',
          'func',
          'obj',
          'Error',
        ]),
        removedOptions = {
          errorDataPath: '',
          format: '`validateFormats: false` can be used instead.',
          nullable: '"nullable" keyword is supported by default.',
          jsonPointers: 'Deprecated jsPropertySyntax can be used instead.',
          extendRefs: 'Deprecated ignoreKeywordsWithRef can be used instead.',
          missingRefs: 'Pass empty schema with $id that should be ignored to ajv.addSchema.',
          processCode: 'Use option `code: {process: (code, schemaEnv: object) => string}`',
          sourceCode: 'Use option `code: {source: true}`',
          strictDefaults: 'It is default now, see option `strict`.',
          strictKeywords: 'It is default now, see option `strict`.',
          uniqueItems: '"uniqueItems" keyword is always validated.',
          unknownFormats:
            'Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).',
          cache: 'Map is used as cache, schema object as key.',
          serialize: 'Map is used as cache, schema object as key.',
          ajvErrors: 'It is default now.',
        },
        deprecatedOptions = {
          ignoreKeywordsWithRef: '',
          jsPropertySyntax: '',
          unicode: '"minLength"/"maxLength" account for unicode characters by default.',
        };
      function requiredOptions(o) {
        var _a,
          _b,
          _c,
          _d,
          _e,
          _f,
          _g,
          _h,
          _j,
          _k,
          _l,
          _m,
          _o,
          _p,
          _q,
          _r,
          _s,
          _t,
          _u,
          _v,
          _w,
          _x,
          _y,
          _z,
          _0;
        const s = o.strict,
          _optz = null === (_a = o.code) || void 0 === _a ? void 0 : _a.optimize,
          optimize = !0 === _optz || void 0 === _optz ? 1 : _optz || 0,
          regExp =
            null !== (_c = null === (_b = o.code) || void 0 === _b ? void 0 : _b.regExp) &&
            void 0 !== _c
              ? _c
              : defaultRegExp,
          uriResolver = null !== (_d = o.uriResolver) && void 0 !== _d ? _d : uri_1.default;
        return {
          strictSchema:
            null === (_f = null !== (_e = o.strictSchema) && void 0 !== _e ? _e : s) ||
            void 0 === _f ||
            _f,
          strictNumbers:
            null === (_h = null !== (_g = o.strictNumbers) && void 0 !== _g ? _g : s) ||
            void 0 === _h ||
            _h,
          strictTypes:
            null !== (_k = null !== (_j = o.strictTypes) && void 0 !== _j ? _j : s) && void 0 !== _k
              ? _k
              : 'log',
          strictTuples:
            null !== (_m = null !== (_l = o.strictTuples) && void 0 !== _l ? _l : s) &&
            void 0 !== _m
              ? _m
              : 'log',
          strictRequired:
            null !== (_p = null !== (_o = o.strictRequired) && void 0 !== _o ? _o : s) &&
            void 0 !== _p &&
            _p,
          code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
          loopRequired: null !== (_q = o.loopRequired) && void 0 !== _q ? _q : 200,
          loopEnum: null !== (_r = o.loopEnum) && void 0 !== _r ? _r : 200,
          meta: null === (_s = o.meta) || void 0 === _s || _s,
          messages: null === (_t = o.messages) || void 0 === _t || _t,
          inlineRefs: null === (_u = o.inlineRefs) || void 0 === _u || _u,
          schemaId: null !== (_v = o.schemaId) && void 0 !== _v ? _v : '$id',
          addUsedSchema: null === (_w = o.addUsedSchema) || void 0 === _w || _w,
          validateSchema: null === (_x = o.validateSchema) || void 0 === _x || _x,
          validateFormats: null === (_y = o.validateFormats) || void 0 === _y || _y,
          unicodeRegExp: null === (_z = o.unicodeRegExp) || void 0 === _z || _z,
          int32range: null === (_0 = o.int32range) || void 0 === _0 || _0,
          uriResolver,
        };
      }
      class Ajv {
        constructor(opts = {}) {
          (this.schemas = {}),
            (this.refs = {}),
            (this.formats = {}),
            (this._compilations = new Set()),
            (this._loading = {}),
            (this._cache = new Map()),
            (opts = this.opts = { ...opts, ...requiredOptions(opts) });
          const { es5, lines } = this.opts.code;
          (this.scope = new codegen_2.ValueScope({
            scope: {},
            prefixes: EXT_SCOPE_NAMES,
            es5,
            lines,
          })),
            (this.logger = (function getLogger(logger) {
              if (!1 === logger) return noLogs;
              if (void 0 === logger) return console;
              if (logger.log && logger.warn && logger.error) return logger;
              throw new Error('logger must implement log, warn and error methods');
            })(opts.logger));
          const formatOpt = opts.validateFormats;
          (opts.validateFormats = !1),
            (this.RULES = (0, rules_1.getRules)()),
            checkOptions.call(this, removedOptions, opts, 'NOT SUPPORTED'),
            checkOptions.call(this, deprecatedOptions, opts, 'DEPRECATED', 'warn'),
            (this._metaOpts = getMetaSchemaOptions.call(this)),
            opts.formats && addInitialFormats.call(this),
            this._addVocabularies(),
            this._addDefaultMetaSchema(),
            opts.keywords && addInitialKeywords.call(this, opts.keywords),
            'object' == typeof opts.meta && this.addMetaSchema(opts.meta),
            addInitialSchemas.call(this),
            (opts.validateFormats = formatOpt);
        }
        _addVocabularies() {
          this.addKeyword('$async');
        }
        _addDefaultMetaSchema() {
          const { $data, meta, schemaId } = this.opts;
          let _dataRefSchema = $dataRefSchema;
          'id' === schemaId &&
            ((_dataRefSchema = { ...$dataRefSchema }),
            (_dataRefSchema.id = _dataRefSchema.$id),
            delete _dataRefSchema.$id),
            meta && $data && this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], !1);
        }
        defaultMeta() {
          const { meta, schemaId } = this.opts;
          return (this.opts.defaultMeta =
            'object' == typeof meta ? meta[schemaId] || meta : void 0);
        }
        validate(schemaKeyRef, data) {
          let v;
          if ('string' == typeof schemaKeyRef) {
            if (((v = this.getSchema(schemaKeyRef)), !v))
              throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
          } else v = this.compile(schemaKeyRef);
          const valid = v(data);
          return '$async' in v || (this.errors = v.errors), valid;
        }
        compile(schema, _meta) {
          const sch = this._addSchema(schema, _meta);
          return sch.validate || this._compileSchemaEnv(sch);
        }
        compileAsync(schema, meta) {
          if ('function' != typeof this.opts.loadSchema)
            throw new Error('options.loadSchema should be a function');
          const { loadSchema } = this.opts;
          return runCompileAsync.call(this, schema, meta);
          async function runCompileAsync(_schema, _meta) {
            await loadMetaSchema.call(this, _schema.$schema);
            const sch = this._addSchema(_schema, _meta);
            return sch.validate || _compileAsync.call(this, sch);
          }
          async function loadMetaSchema($ref) {
            $ref && !this.getSchema($ref) && (await runCompileAsync.call(this, { $ref }, !0));
          }
          async function _compileAsync(sch) {
            try {
              return this._compileSchemaEnv(sch);
            } catch (e) {
              if (!(e instanceof ref_error_1.default)) throw e;
              return (
                checkLoaded.call(this, e),
                await loadMissingSchema.call(this, e.missingSchema),
                _compileAsync.call(this, sch)
              );
            }
          }
          function checkLoaded({ missingSchema: ref, missingRef }) {
            if (this.refs[ref])
              throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
          async function loadMissingSchema(ref) {
            const _schema = await _loadSchema.call(this, ref);
            this.refs[ref] || (await loadMetaSchema.call(this, _schema.$schema)),
              this.refs[ref] || this.addSchema(_schema, ref, meta);
          }
          async function _loadSchema(ref) {
            const p = this._loading[ref];
            if (p) return p;
            try {
              return await (this._loading[ref] = loadSchema(ref));
            } finally {
              delete this._loading[ref];
            }
          }
        }
        addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
          if (Array.isArray(schema)) {
            for (const sch of schema) this.addSchema(sch, void 0, _meta, _validateSchema);
            return this;
          }
          let id;
          if ('object' == typeof schema) {
            const { schemaId } = this.opts;
            if (((id = schema[schemaId]), void 0 !== id && 'string' != typeof id))
              throw new Error(`schema ${schemaId} must be string`);
          }
          return (
            (key = (0, resolve_1.normalizeId)(key || id)),
            this._checkUnique(key),
            (this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, !0)),
            this
          );
        }
        addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
          return this.addSchema(schema, key, !0, _validateSchema), this;
        }
        validateSchema(schema, throwOrLogError) {
          if ('boolean' == typeof schema) return !0;
          let $schema;
          if ((($schema = schema.$schema), void 0 !== $schema && 'string' != typeof $schema))
            throw new Error('$schema must be a string');
          if ((($schema = $schema || this.opts.defaultMeta || this.defaultMeta()), !$schema))
            return this.logger.warn('meta-schema not available'), (this.errors = null), !0;
          const valid = this.validate($schema, schema);
          if (!valid && throwOrLogError) {
            const message = 'schema is invalid: ' + this.errorsText();
            if ('log' !== this.opts.validateSchema) throw new Error(message);
            this.logger.error(message);
          }
          return valid;
        }
        getSchema(keyRef) {
          let sch;
          for (; 'string' == typeof (sch = getSchEnv.call(this, keyRef)); ) keyRef = sch;
          if (void 0 === sch) {
            const { schemaId } = this.opts,
              root = new compile_1.SchemaEnv({ schema: {}, schemaId });
            if (((sch = compile_1.resolveSchema.call(this, root, keyRef)), !sch)) return;
            this.refs[keyRef] = sch;
          }
          return sch.validate || this._compileSchemaEnv(sch);
        }
        removeSchema(schemaKeyRef) {
          if (schemaKeyRef instanceof RegExp)
            return (
              this._removeAllSchemas(this.schemas, schemaKeyRef),
              this._removeAllSchemas(this.refs, schemaKeyRef),
              this
            );
          switch (typeof schemaKeyRef) {
            case 'undefined':
              return (
                this._removeAllSchemas(this.schemas),
                this._removeAllSchemas(this.refs),
                this._cache.clear(),
                this
              );
            case 'string': {
              const sch = getSchEnv.call(this, schemaKeyRef);
              return (
                'object' == typeof sch && this._cache.delete(sch.schema),
                delete this.schemas[schemaKeyRef],
                delete this.refs[schemaKeyRef],
                this
              );
            }
            case 'object': {
              const cacheKey = schemaKeyRef;
              this._cache.delete(cacheKey);
              let id = schemaKeyRef[this.opts.schemaId];
              return (
                id &&
                  ((id = (0, resolve_1.normalizeId)(id)),
                  delete this.schemas[id],
                  delete this.refs[id]),
                this
              );
            }
            default:
              throw new Error('ajv.removeSchema: invalid parameter');
          }
        }
        addVocabulary(definitions) {
          for (const def of definitions) this.addKeyword(def);
          return this;
        }
        addKeyword(kwdOrDef, def) {
          let keyword;
          if ('string' == typeof kwdOrDef)
            (keyword = kwdOrDef),
              'object' == typeof def &&
                (this.logger.warn('these parameters are deprecated, see docs for addKeyword'),
                (def.keyword = keyword));
          else {
            if ('object' != typeof kwdOrDef || void 0 !== def)
              throw new Error('invalid addKeywords parameters');
            if (((keyword = (def = kwdOrDef).keyword), Array.isArray(keyword) && !keyword.length))
              throw new Error('addKeywords: keyword must be string or non-empty array');
          }
          if ((checkKeyword.call(this, keyword, def), !def))
            return (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd)), this;
          keywordMetaschema.call(this, def);
          const definition = {
            ...def,
            type: (0, dataType_1.getJSONTypes)(def.type),
            schemaType: (0, dataType_1.getJSONTypes)(def.schemaType),
          };
          return (
            (0, util_1.eachItem)(
              keyword,
              0 === definition.type.length
                ? (k) => addRule.call(this, k, definition)
                : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)),
            ),
            this
          );
        }
        getKeyword(keyword) {
          const rule = this.RULES.all[keyword];
          return 'object' == typeof rule ? rule.definition : !!rule;
        }
        removeKeyword(keyword) {
          const { RULES } = this;
          delete RULES.keywords[keyword], delete RULES.all[keyword];
          for (const group of RULES.rules) {
            const i = group.rules.findIndex((rule) => rule.keyword === keyword);
            i >= 0 && group.rules.splice(i, 1);
          }
          return this;
        }
        addFormat(name, format) {
          return (
            'string' == typeof format && (format = new RegExp(format)),
            (this.formats[name] = format),
            this
          );
        }
        errorsText(errors = this.errors, { separator = ', ', dataVar = 'data' } = {}) {
          return errors && 0 !== errors.length
            ? errors
                .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
                .reduce((text, msg) => text + separator + msg)
            : 'No errors';
        }
        $dataMetaSchema(metaSchema, keywordsJsonPointers) {
          const rules = this.RULES.all;
          metaSchema = JSON.parse(JSON.stringify(metaSchema));
          for (const jsonPointer of keywordsJsonPointers) {
            const segments = jsonPointer.split('/').slice(1);
            let keywords = metaSchema;
            for (const seg of segments) keywords = keywords[seg];
            for (const key in rules) {
              const rule = rules[key];
              if ('object' != typeof rule) continue;
              const { $data } = rule.definition,
                schema = keywords[key];
              $data && schema && (keywords[key] = schemaOrData(schema));
            }
          }
          return metaSchema;
        }
        _removeAllSchemas(schemas, regex) {
          for (const keyRef in schemas) {
            const sch = schemas[keyRef];
            (regex && !regex.test(keyRef)) ||
              ('string' == typeof sch
                ? delete schemas[keyRef]
                : sch && !sch.meta && (this._cache.delete(sch.schema), delete schemas[keyRef]));
          }
        }
        _addSchema(
          schema,
          meta,
          baseId,
          validateSchema = this.opts.validateSchema,
          addSchema = this.opts.addUsedSchema,
        ) {
          let id;
          const { schemaId } = this.opts;
          if ('object' == typeof schema) id = schema[schemaId];
          else {
            if (this.opts.jtd) throw new Error('schema must be object');
            if ('boolean' != typeof schema) throw new Error('schema must be object or boolean');
          }
          let sch = this._cache.get(schema);
          if (void 0 !== sch) return sch;
          baseId = (0, resolve_1.normalizeId)(id || baseId);
          const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
          return (
            (sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs })),
            this._cache.set(sch.schema, sch),
            addSchema &&
              !baseId.startsWith('#') &&
              (baseId && this._checkUnique(baseId), (this.refs[baseId] = sch)),
            validateSchema && this.validateSchema(schema, !0),
            sch
          );
        }
        _checkUnique(id) {
          if (this.schemas[id] || this.refs[id])
            throw new Error(`schema with key or id "${id}" already exists`);
        }
        _compileSchemaEnv(sch) {
          if (
            (sch.meta ? this._compileMetaSchema(sch) : compile_1.compileSchema.call(this, sch),
            !sch.validate)
          )
            throw new Error('ajv implementation error');
          return sch.validate;
        }
        _compileMetaSchema(sch) {
          const currentOpts = this.opts;
          this.opts = this._metaOpts;
          try {
            compile_1.compileSchema.call(this, sch);
          } finally {
            this.opts = currentOpts;
          }
        }
      }
      function checkOptions(checkOpts, options, msg, log = 'error') {
        for (const key in checkOpts) {
          const opt = key;
          opt in options && this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
        }
      }
      function getSchEnv(keyRef) {
        return (
          (keyRef = (0, resolve_1.normalizeId)(keyRef)), this.schemas[keyRef] || this.refs[keyRef]
        );
      }
      function addInitialSchemas() {
        const optsSchemas = this.opts.schemas;
        if (optsSchemas)
          if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
          else for (const key in optsSchemas) this.addSchema(optsSchemas[key], key);
      }
      function addInitialFormats() {
        for (const name in this.opts.formats) {
          const format = this.opts.formats[name];
          format && this.addFormat(name, format);
        }
      }
      function addInitialKeywords(defs) {
        if (Array.isArray(defs)) this.addVocabulary(defs);
        else {
          this.logger.warn('keywords option as map is deprecated, pass array');
          for (const keyword in defs) {
            const def = defs[keyword];
            def.keyword || (def.keyword = keyword), this.addKeyword(def);
          }
        }
      }
      function getMetaSchemaOptions() {
        const metaOpts = { ...this.opts };
        for (const opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
        return metaOpts;
      }
      (Ajv.ValidationError = validation_error_1.default),
        (Ajv.MissingRefError = ref_error_1.default),
        (exports.default = Ajv);
      const noLogs = { log() {}, warn() {}, error() {} };
      const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
      function checkKeyword(keyword, def) {
        const { RULES } = this;
        if (
          ((0, util_1.eachItem)(keyword, (kwd) => {
            if (RULES.keywords[kwd]) throw new Error(`Keyword ${kwd} is already defined`);
            if (!KEYWORD_NAME.test(kwd)) throw new Error(`Keyword ${kwd} has invalid name`);
          }),
          def && def.$data && !('code' in def) && !('validate' in def))
        )
          throw new Error('$data keyword must have "code" or "validate" function');
      }
      function addRule(keyword, definition, dataType) {
        var _a;
        const post = null == definition ? void 0 : definition.post;
        if (dataType && post) throw new Error('keyword with "post" flag cannot have "type"');
        const { RULES } = this;
        let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
        if (
          (ruleGroup || ((ruleGroup = { type: dataType, rules: [] }), RULES.rules.push(ruleGroup)),
          (RULES.keywords[keyword] = !0),
          !definition)
        )
          return;
        const rule = {
          keyword,
          definition: {
            ...definition,
            type: (0, dataType_1.getJSONTypes)(definition.type),
            schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType),
          },
        };
        definition.before
          ? addBeforeRule.call(this, ruleGroup, rule, definition.before)
          : ruleGroup.rules.push(rule),
          (RULES.all[keyword] = rule),
          null === (_a = definition.implements) ||
            void 0 === _a ||
            _a.forEach((kwd) => this.addKeyword(kwd));
      }
      function addBeforeRule(ruleGroup, rule, before) {
        const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
        i >= 0
          ? ruleGroup.rules.splice(i, 0, rule)
          : (ruleGroup.rules.push(rule), this.logger.warn(`rule ${before} is not defined`));
      }
      function keywordMetaschema(def) {
        let { metaSchema } = def;
        void 0 !== metaSchema &&
          (def.$data && this.opts.$data && (metaSchema = schemaOrData(metaSchema)),
          (def.validateSchema = this.compile(metaSchema, !0)));
      }
      const $dataRef = {
        $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#',
      };
      function schemaOrData(schema) {
        return { anyOf: [schema, $dataRef] };
      }
    },
    '../../../node_modules/ajv/dist/runtime/equal.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const equal = __webpack_require__('../../../node_modules/fast-deep-equal/index.js');
      (equal.code = 'require("ajv/dist/runtime/equal").default'), (exports.default = equal);
    },
    '../../../node_modules/ajv/dist/runtime/ucs2length.js': (__unused_webpack_module, exports) => {
      function ucs2length(str) {
        const len = str.length;
        let value,
          length = 0,
          pos = 0;
        for (; pos < len; )
          length++,
            (value = str.charCodeAt(pos++)),
            value >= 55296 &&
              value <= 56319 &&
              pos < len &&
              ((value = str.charCodeAt(pos)), 56320 == (64512 & value) && pos++);
        return length;
      }
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.default = ucs2length),
        (ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default');
    },
    '../../../node_modules/ajv/dist/runtime/uri.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const uri = __webpack_require__('../../../node_modules/fast-uri/index.js');
      (uri.code = 'require("ajv/dist/runtime/uri").default'), (exports.default = uri);
    },
    '../../../node_modules/ajv/dist/runtime/validation_error.js': (
      __unused_webpack_module,
      exports,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      class ValidationError extends Error {
        constructor(errors) {
          super('validation failed'), (this.errors = errors), (this.ajv = this.validation = !0);
        }
      }
      exports.default = ValidationError;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/additionalItems.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.validateAdditionalItems = void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'additionalItems',
          type: 'array',
          schemaType: ['boolean', 'object'],
          before: 'uniqueItems',
          error: {
            message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
            params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
          },
          code(cxt) {
            const { parentSchema, it } = cxt,
              { items } = parentSchema;
            Array.isArray(items)
              ? validateAdditionalItems(cxt, items)
              : (0, util_1.checkStrictMode)(
                  it,
                  '"additionalItems" is ignored when "items" is not an array of schemas',
                );
          },
        };
      function validateAdditionalItems(cxt, items) {
        const { gen, schema, data, keyword, it } = cxt;
        it.items = !0;
        const len = gen.const('len', codegen_1._`${data}.length`);
        if (!1 === schema)
          cxt.setParams({ len: items.length }), cxt.pass(codegen_1._`${len} <= ${items.length}`);
        else if ('object' == typeof schema && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.var('valid', codegen_1._`${len} <= ${items.length}`);
          gen.if((0, codegen_1.not)(valid), () =>
            (function validateItems(valid) {
              gen.forRange('i', items.length, len, (i) => {
                cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid),
                  it.allErrors || gen.if((0, codegen_1.not)(valid), () => gen.break());
              });
            })(valid),
          ),
            cxt.ok(valid);
        }
      }
      (exports.validateAdditionalItems = validateAdditionalItems), (exports.default = def);
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'additionalProperties',
          type: ['object'],
          schemaType: ['boolean', 'object'],
          allowUndefined: !0,
          trackErrors: !0,
          error: {
            message: 'must NOT have additional properties',
            params: ({ params }) => codegen_1._`{additionalProperty: ${params.additionalProperty}}`,
          },
          code(cxt) {
            const { gen, schema, parentSchema, data, errsCount, it } = cxt;
            if (!errsCount) throw new Error('ajv implementation error');
            const { allErrors, opts } = it;
            if (
              ((it.props = !0),
              'all' !== opts.removeAdditional && (0, util_1.alwaysValidSchema)(it, schema))
            )
              return;
            const props = (0, code_1.allSchemaProperties)(parentSchema.properties),
              patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
            function deleteAdditional(key) {
              gen.code(codegen_1._`delete ${data}[${key}]`);
            }
            function additionalPropertyCode(key) {
              if ('all' === opts.removeAdditional || (opts.removeAdditional && !1 === schema))
                deleteAdditional(key);
              else {
                if (!1 === schema)
                  return (
                    cxt.setParams({ additionalProperty: key }),
                    cxt.error(),
                    void (allErrors || gen.break())
                  );
                if ('object' == typeof schema && !(0, util_1.alwaysValidSchema)(it, schema)) {
                  const valid = gen.name('valid');
                  'failing' === opts.removeAdditional
                    ? (applyAdditionalSchema(key, valid, !1),
                      gen.if((0, codegen_1.not)(valid), () => {
                        cxt.reset(), deleteAdditional(key);
                      }))
                    : (applyAdditionalSchema(key, valid),
                      allErrors || gen.if((0, codegen_1.not)(valid), () => gen.break()));
                }
              }
            }
            function applyAdditionalSchema(key, valid, errors) {
              const subschema = {
                keyword: 'additionalProperties',
                dataProp: key,
                dataPropType: util_1.Type.Str,
              };
              !1 === errors &&
                Object.assign(subschema, { compositeRule: !0, createErrors: !1, allErrors: !1 }),
                cxt.subschema(subschema, valid);
            }
            !(function checkAdditionalProperties() {
              gen.forIn('key', data, (key) => {
                props.length || patProps.length
                  ? gen.if(
                      (function isAdditional(key) {
                        let definedProp;
                        if (props.length > 8) {
                          const propsSchema = (0, util_1.schemaRefOrVal)(
                            it,
                            parentSchema.properties,
                            'properties',
                          );
                          definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
                        } else
                          definedProp = props.length
                            ? (0, codegen_1.or)(...props.map((p) => codegen_1._`${key} === ${p}`))
                            : codegen_1.nil;
                        patProps.length &&
                          (definedProp = (0, codegen_1.or)(
                            definedProp,
                            ...patProps.map(
                              (p) => codegen_1._`${(0, code_1.usePattern)(cxt, p)}.test(${key})`,
                            ),
                          ));
                        return (0, codegen_1.not)(definedProp);
                      })(key),
                      () => additionalPropertyCode(key),
                    )
                  : additionalPropertyCode(key);
              });
            })(),
              cxt.ok(codegen_1._`${errsCount} === ${names_1.default.errors}`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/allOf.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'allOf',
          schemaType: 'array',
          code(cxt) {
            const { gen, schema, it } = cxt;
            if (!Array.isArray(schema)) throw new Error('ajv implementation error');
            const valid = gen.name('valid');
            schema.forEach((sch, i) => {
              if ((0, util_1.alwaysValidSchema)(it, sch)) return;
              const schCxt = cxt.subschema({ keyword: 'allOf', schemaProp: i }, valid);
              cxt.ok(valid), cxt.mergeEvaluated(schCxt);
            });
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/anyOf.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const def = {
        keyword: 'anyOf',
        schemaType: 'array',
        trackErrors: !0,
        code: __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js')
          .validateUnion,
        error: { message: 'must match a schema in anyOf' },
      };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/contains.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'contains',
          type: 'array',
          schemaType: ['object', 'boolean'],
          before: 'uniqueItems',
          trackErrors: !0,
          error: {
            message: ({ params: { min, max } }) =>
              void 0 === max
                ? codegen_1.str`must contain at least ${min} valid item(s)`
                : codegen_1.str`must contain at least ${min} and no more than ${max} valid item(s)`,
            params: ({ params: { min, max } }) =>
              void 0 === max
                ? codegen_1._`{minContains: ${min}}`
                : codegen_1._`{minContains: ${min}, maxContains: ${max}}`,
          },
          code(cxt) {
            const { gen, schema, parentSchema, data, it } = cxt;
            let min, max;
            const { minContains, maxContains } = parentSchema;
            it.opts.next
              ? ((min = void 0 === minContains ? 1 : minContains), (max = maxContains))
              : (min = 1);
            const len = gen.const('len', codegen_1._`${data}.length`);
            if ((cxt.setParams({ min, max }), void 0 === max && 0 === min))
              return void (0, util_1.checkStrictMode)(
                it,
                '"minContains" == 0 without "maxContains": "contains" keyword ignored',
              );
            if (void 0 !== max && min > max)
              return (
                (0, util_1.checkStrictMode)(it, '"minContains" > "maxContains" is always invalid'),
                void cxt.fail()
              );
            if ((0, util_1.alwaysValidSchema)(it, schema)) {
              let cond = codegen_1._`${len} >= ${min}`;
              return (
                void 0 !== max && (cond = codegen_1._`${cond} && ${len} <= ${max}`),
                void cxt.pass(cond)
              );
            }
            it.items = !0;
            const valid = gen.name('valid');
            function validateItemsWithCount() {
              const schValid = gen.name('_valid'),
                count = gen.let('count', 0);
              validateItems(schValid, () =>
                gen.if(schValid, () =>
                  (function checkLimits(count) {
                    gen.code(codegen_1._`${count}++`),
                      void 0 === max
                        ? gen.if(codegen_1._`${count} >= ${min}`, () =>
                            gen.assign(valid, !0).break(),
                          )
                        : (gen.if(codegen_1._`${count} > ${max}`, () =>
                            gen.assign(valid, !1).break(),
                          ),
                          1 === min
                            ? gen.assign(valid, !0)
                            : gen.if(codegen_1._`${count} >= ${min}`, () => gen.assign(valid, !0)));
                  })(count),
                ),
              );
            }
            function validateItems(_valid, block) {
              gen.forRange('i', 0, len, (i) => {
                cxt.subschema(
                  {
                    keyword: 'contains',
                    dataProp: i,
                    dataPropType: util_1.Type.Num,
                    compositeRule: !0,
                  },
                  _valid,
                ),
                  block();
              });
            }
            void 0 === max && 1 === min
              ? validateItems(valid, () => gen.if(valid, () => gen.break()))
              : 0 === min
                ? (gen.let(valid, !0),
                  void 0 !== max && gen.if(codegen_1._`${data}.length > 0`, validateItemsWithCount))
                : (gen.let(valid, !1), validateItemsWithCount()),
              cxt.result(valid, () => cxt.reset());
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/dependencies.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js');
      exports.error = {
        message: ({ params: { property, depsCount, deps } }) => {
          const property_ies = 1 === depsCount ? 'property' : 'properties';
          return codegen_1.str`must have ${property_ies} ${deps} when property ${property} is present`;
        },
        params: ({
          params: { property, depsCount, deps, missingProperty },
        }) => codegen_1._`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`,
      };
      const def = {
        keyword: 'dependencies',
        type: 'object',
        schemaType: 'object',
        error: exports.error,
        code(cxt) {
          const [propDeps, schDeps] = (function splitDependencies({ schema }) {
            const propertyDeps = {},
              schemaDeps = {};
            for (const key in schema) {
              if ('__proto__' === key) continue;
              (Array.isArray(schema[key]) ? propertyDeps : schemaDeps)[key] = schema[key];
            }
            return [propertyDeps, schemaDeps];
          })(cxt);
          validatePropertyDeps(cxt, propDeps), validateSchemaDeps(cxt, schDeps);
        },
      };
      function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
        const { gen, data, it } = cxt;
        if (0 === Object.keys(propertyDeps).length) return;
        const missing = gen.let('missing');
        for (const prop in propertyDeps) {
          const deps = propertyDeps[prop];
          if (0 === deps.length) continue;
          const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
          cxt.setParams({ property: prop, depsCount: deps.length, deps: deps.join(', ') }),
            it.allErrors
              ? gen.if(hasProperty, () => {
                  for (const depProp of deps) (0, code_1.checkReportMissingProp)(cxt, depProp);
                })
              : (gen.if(
                  codegen_1._`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`,
                ),
                (0, code_1.reportMissingProp)(cxt, missing),
                gen.else());
        }
      }
      function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
        const { gen, data, keyword, it } = cxt,
          valid = gen.name('valid');
        for (const prop in schemaDeps)
          (0, util_1.alwaysValidSchema)(it, schemaDeps[prop]) ||
            (gen.if(
              (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
              () => {
                const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
                cxt.mergeValidEvaluated(schCxt, valid);
              },
              () => gen.var(valid, !0),
            ),
            cxt.ok(valid));
      }
      (exports.validatePropertyDeps = validatePropertyDeps),
        (exports.validateSchemaDeps = validateSchemaDeps),
        (exports.default = def);
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/if.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'if',
          schemaType: ['object', 'boolean'],
          trackErrors: !0,
          error: {
            message: ({ params }) => codegen_1.str`must match "${params.ifClause}" schema`,
            params: ({ params }) => codegen_1._`{failingKeyword: ${params.ifClause}}`,
          },
          code(cxt) {
            const { gen, parentSchema, it } = cxt;
            void 0 === parentSchema.then &&
              void 0 === parentSchema.else &&
              (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
            const hasThen = hasSchema(it, 'then'),
              hasElse = hasSchema(it, 'else');
            if (!hasThen && !hasElse) return;
            const valid = gen.let('valid', !0),
              schValid = gen.name('_valid');
            if (
              ((function validateIf() {
                const schCxt = cxt.subschema(
                  { keyword: 'if', compositeRule: !0, createErrors: !1, allErrors: !1 },
                  schValid,
                );
                cxt.mergeEvaluated(schCxt);
              })(),
              cxt.reset(),
              hasThen && hasElse)
            ) {
              const ifClause = gen.let('ifClause');
              cxt.setParams({ ifClause }),
                gen.if(
                  schValid,
                  validateClause('then', ifClause),
                  validateClause('else', ifClause),
                );
            } else
              hasThen
                ? gen.if(schValid, validateClause('then'))
                : gen.if((0, codegen_1.not)(schValid), validateClause('else'));
            function validateClause(keyword, ifClause) {
              return () => {
                const schCxt = cxt.subschema({ keyword }, schValid);
                gen.assign(valid, schValid),
                  cxt.mergeValidEvaluated(schCxt, valid),
                  ifClause
                    ? gen.assign(ifClause, codegen_1._`${keyword}`)
                    : cxt.setParams({ ifClause: keyword });
              };
            }
            cxt.pass(valid, () => cxt.error(!0));
          },
        };
      function hasSchema(it, keyword) {
        const schema = it.schema[keyword];
        return void 0 !== schema && !(0, util_1.alwaysValidSchema)(it, schema);
      }
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const additionalItems_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/additionalItems.js',
        ),
        prefixItems_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/prefixItems.js',
        ),
        items_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/items.js',
        ),
        items2020_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/items2020.js',
        ),
        contains_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/contains.js',
        ),
        dependencies_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/dependencies.js',
        ),
        propertyNames_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/propertyNames.js',
        ),
        additionalProperties_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js',
        ),
        properties_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/properties.js',
        ),
        patternProperties_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/patternProperties.js',
        ),
        not_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/not.js',
        ),
        anyOf_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/anyOf.js',
        ),
        oneOf_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/oneOf.js',
        ),
        allOf_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/allOf.js',
        ),
        if_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/applicator/if.js'),
        thenElse_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/thenElse.js',
        );
      exports.default = function getApplicator(draft2020 = !1) {
        const applicator = [
          not_1.default,
          anyOf_1.default,
          oneOf_1.default,
          allOf_1.default,
          if_1.default,
          thenElse_1.default,
          propertyNames_1.default,
          additionalProperties_1.default,
          dependencies_1.default,
          properties_1.default,
          patternProperties_1.default,
        ];
        return (
          draft2020
            ? applicator.push(prefixItems_1.default, items2020_1.default)
            : applicator.push(additionalItems_1.default, items_1.default),
          applicator.push(contains_1.default),
          applicator
        );
      };
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/items.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }), (exports.validateTuple = void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        def = {
          keyword: 'items',
          type: 'array',
          schemaType: ['object', 'array', 'boolean'],
          before: 'uniqueItems',
          code(cxt) {
            const { schema, it } = cxt;
            if (Array.isArray(schema)) return validateTuple(cxt, 'additionalItems', schema);
            (it.items = !0),
              (0, util_1.alwaysValidSchema)(it, schema) || cxt.ok((0, code_1.validateArray)(cxt));
          },
        };
      function validateTuple(cxt, extraItems, schArr = cxt.schema) {
        const { gen, parentSchema, data, keyword, it } = cxt;
        !(function checkStrictTuple(sch) {
          const { opts, errSchemaPath } = it,
            l = schArr.length,
            fullTuple = l === sch.minItems && (l === sch.maxItems || !1 === sch[extraItems]);
          if (opts.strictTuples && !fullTuple) {
            const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
            (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
          }
        })(parentSchema),
          it.opts.unevaluated &&
            schArr.length &&
            !0 !== it.items &&
            (it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items));
        const valid = gen.name('valid'),
          len = gen.const('len', codegen_1._`${data}.length`);
        schArr.forEach((sch, i) => {
          (0, util_1.alwaysValidSchema)(it, sch) ||
            (gen.if(codegen_1._`${len} > ${i}`, () =>
              cxt.subschema({ keyword, schemaProp: i, dataProp: i }, valid),
            ),
            cxt.ok(valid));
        });
      }
      (exports.validateTuple = validateTuple), (exports.default = def);
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/items2020.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        additionalItems_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/additionalItems.js',
        ),
        def = {
          keyword: 'items',
          type: 'array',
          schemaType: ['object', 'boolean'],
          before: 'uniqueItems',
          error: {
            message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
            params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
          },
          code(cxt) {
            const { schema, parentSchema, it } = cxt,
              { prefixItems } = parentSchema;
            (it.items = !0),
              (0, util_1.alwaysValidSchema)(it, schema) ||
                (prefixItems
                  ? (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems)
                  : cxt.ok((0, code_1.validateArray)(cxt)));
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/not.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'not',
          schemaType: ['object', 'boolean'],
          trackErrors: !0,
          code(cxt) {
            const { gen, schema, it } = cxt;
            if ((0, util_1.alwaysValidSchema)(it, schema)) return void cxt.fail();
            const valid = gen.name('valid');
            cxt.subschema(
              { keyword: 'not', compositeRule: !0, createErrors: !1, allErrors: !1 },
              valid,
            ),
              cxt.failResult(
                valid,
                () => cxt.reset(),
                () => cxt.error(),
              );
          },
          error: { message: 'must NOT be valid' },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/oneOf.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'oneOf',
          schemaType: 'array',
          trackErrors: !0,
          error: {
            message: 'must match exactly one schema in oneOf',
            params: ({ params }) => codegen_1._`{passingSchemas: ${params.passing}}`,
          },
          code(cxt) {
            const { gen, schema, parentSchema, it } = cxt;
            if (!Array.isArray(schema)) throw new Error('ajv implementation error');
            if (it.opts.discriminator && parentSchema.discriminator) return;
            const schArr = schema,
              valid = gen.let('valid', !1),
              passing = gen.let('passing', null),
              schValid = gen.name('_valid');
            cxt.setParams({ passing }),
              gen.block(function validateOneOf() {
                schArr.forEach((sch, i) => {
                  let schCxt;
                  (0, util_1.alwaysValidSchema)(it, sch)
                    ? gen.var(schValid, !0)
                    : (schCxt = cxt.subschema(
                        { keyword: 'oneOf', schemaProp: i, compositeRule: !0 },
                        schValid,
                      )),
                    i > 0 &&
                      gen
                        .if(codegen_1._`${schValid} && ${valid}`)
                        .assign(valid, !1)
                        .assign(passing, codegen_1._`[${passing}, ${i}]`)
                        .else(),
                    gen.if(schValid, () => {
                      gen.assign(valid, !0),
                        gen.assign(passing, i),
                        schCxt && cxt.mergeEvaluated(schCxt, codegen_1.Name);
                    });
                });
              }),
              cxt.result(
                valid,
                () => cxt.reset(),
                () => cxt.error(!0),
              );
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/patternProperties.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        util_2 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'patternProperties',
          type: 'object',
          schemaType: 'object',
          code(cxt) {
            const { gen, schema, data, parentSchema, it } = cxt,
              { opts } = it,
              patterns = (0, code_1.allSchemaProperties)(schema),
              alwaysValidPatterns = patterns.filter((p) =>
                (0, util_1.alwaysValidSchema)(it, schema[p]),
              );
            if (
              0 === patterns.length ||
              (alwaysValidPatterns.length === patterns.length &&
                (!it.opts.unevaluated || !0 === it.props))
            )
              return;
            const checkProperties =
                opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties,
              valid = gen.name('valid');
            !0 === it.props ||
              it.props instanceof codegen_1.Name ||
              (it.props = (0, util_2.evaluatedPropsToName)(gen, it.props));
            const { props } = it;
            function checkMatchingProperties(pat) {
              for (const prop in checkProperties)
                new RegExp(pat).test(prop) &&
                  (0, util_1.checkStrictMode)(
                    it,
                    `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`,
                  );
            }
            function validateProperties(pat) {
              gen.forIn('key', data, (key) => {
                gen.if(codegen_1._`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
                  const alwaysValid = alwaysValidPatterns.includes(pat);
                  alwaysValid ||
                    cxt.subschema(
                      {
                        keyword: 'patternProperties',
                        schemaProp: pat,
                        dataProp: key,
                        dataPropType: util_2.Type.Str,
                      },
                      valid,
                    ),
                    it.opts.unevaluated && !0 !== props
                      ? gen.assign(codegen_1._`${props}[${key}]`, !0)
                      : alwaysValid ||
                        it.allErrors ||
                        gen.if((0, codegen_1.not)(valid), () => gen.break());
                });
              });
            }
            !(function validatePatternProperties() {
              for (const pat of patterns)
                checkProperties && checkMatchingProperties(pat),
                  it.allErrors
                    ? validateProperties(pat)
                    : (gen.var(valid, !0), validateProperties(pat), gen.if(valid));
            })();
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/prefixItems.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const items_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/items.js',
        ),
        def = {
          keyword: 'prefixItems',
          type: 'array',
          schemaType: ['array'],
          before: 'uniqueItems',
          code: (cxt) => (0, items_1.validateTuple)(cxt, 'items'),
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/properties.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const validate_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/index.js',
        ),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        additionalProperties_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js',
        ),
        def = {
          keyword: 'properties',
          type: 'object',
          schemaType: 'object',
          code(cxt) {
            const { gen, schema, parentSchema, data, it } = cxt;
            'all' === it.opts.removeAdditional &&
              void 0 === parentSchema.additionalProperties &&
              additionalProperties_1.default.code(
                new validate_1.KeywordCxt(
                  it,
                  additionalProperties_1.default,
                  'additionalProperties',
                ),
              );
            const allProps = (0, code_1.allSchemaProperties)(schema);
            for (const prop of allProps) it.definedProperties.add(prop);
            it.opts.unevaluated &&
              allProps.length &&
              !0 !== it.props &&
              (it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props));
            const properties = allProps.filter(
              (p) => !(0, util_1.alwaysValidSchema)(it, schema[p]),
            );
            if (0 === properties.length) return;
            const valid = gen.name('valid');
            for (const prop of properties)
              hasDefault(prop)
                ? applyPropertySchema(prop)
                : (gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties)),
                  applyPropertySchema(prop),
                  it.allErrors || gen.else().var(valid, !0),
                  gen.endIf()),
                cxt.it.definedProperties.add(prop),
                cxt.ok(valid);
            function hasDefault(prop) {
              return it.opts.useDefaults && !it.compositeRule && void 0 !== schema[prop].default;
            }
            function applyPropertySchema(prop) {
              cxt.subschema({ keyword: 'properties', schemaProp: prop, dataProp: prop }, valid);
            }
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/propertyNames.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'propertyNames',
          type: 'object',
          schemaType: ['object', 'boolean'],
          error: {
            message: 'property name must be valid',
            params: ({ params }) => codegen_1._`{propertyName: ${params.propertyName}}`,
          },
          code(cxt) {
            const { gen, schema, data, it } = cxt;
            if ((0, util_1.alwaysValidSchema)(it, schema)) return;
            const valid = gen.name('valid');
            gen.forIn('key', data, (key) => {
              cxt.setParams({ propertyName: key }),
                cxt.subschema(
                  {
                    keyword: 'propertyNames',
                    data: key,
                    dataTypes: ['string'],
                    propertyName: key,
                    compositeRule: !0,
                  },
                  valid,
                ),
                gen.if((0, codegen_1.not)(valid), () => {
                  cxt.error(!0), it.allErrors || gen.break();
                });
            }),
              cxt.ok(valid);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/applicator/thenElse.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: ['then', 'else'],
          schemaType: ['object', 'boolean'],
          code({ keyword, parentSchema, it }) {
            void 0 === parentSchema.if &&
              (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/code.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.validateUnion =
          exports.validateArray =
          exports.usePattern =
          exports.callValidateCode =
          exports.schemaProperties =
          exports.allSchemaProperties =
          exports.noPropertyInData =
          exports.propertyInData =
          exports.isOwnProperty =
          exports.hasPropFunc =
          exports.reportMissingProp =
          exports.checkMissingProp =
          exports.checkReportMissingProp =
            void 0);
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        util_2 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js');
      function hasPropFunc(gen) {
        return gen.scopeValue('func', {
          ref: Object.prototype.hasOwnProperty,
          code: codegen_1._`Object.prototype.hasOwnProperty`,
        });
      }
      function isOwnProperty(gen, data, property) {
        return codegen_1._`${hasPropFunc(gen)}.call(${data}, ${property})`;
      }
      function noPropertyInData(gen, data, property, ownProperties) {
        const cond = codegen_1._`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
        return ownProperties
          ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property)))
          : cond;
      }
      function allSchemaProperties(schemaMap) {
        return schemaMap ? Object.keys(schemaMap).filter((p) => '__proto__' !== p) : [];
      }
      (exports.checkReportMissingProp = function checkReportMissingProp(cxt, prop) {
        const { gen, data, it } = cxt;
        gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
          cxt.setParams({ missingProperty: codegen_1._`${prop}` }, !0), cxt.error();
        });
      }),
        (exports.checkMissingProp = function checkMissingProp(
          { gen, data, it: { opts } },
          properties,
          missing,
        ) {
          return (0, codegen_1.or)(
            ...properties.map((prop) =>
              (0, codegen_1.and)(
                noPropertyInData(gen, data, prop, opts.ownProperties),
                codegen_1._`${missing} = ${prop}`,
              ),
            ),
          );
        }),
        (exports.reportMissingProp = function reportMissingProp(cxt, missing) {
          cxt.setParams({ missingProperty: missing }, !0), cxt.error();
        }),
        (exports.hasPropFunc = hasPropFunc),
        (exports.isOwnProperty = isOwnProperty),
        (exports.propertyInData = function propertyInData(gen, data, property, ownProperties) {
          const cond = codegen_1._`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
          return ownProperties
            ? codegen_1._`${cond} && ${isOwnProperty(gen, data, property)}`
            : cond;
        }),
        (exports.noPropertyInData = noPropertyInData),
        (exports.allSchemaProperties = allSchemaProperties),
        (exports.schemaProperties = function schemaProperties(it, schemaMap) {
          return allSchemaProperties(schemaMap).filter(
            (p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]),
          );
        }),
        (exports.callValidateCode = function callValidateCode(
          { schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it },
          func,
          context,
          passSchema,
        ) {
          const dataAndSchema = passSchema
              ? codegen_1._`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}`
              : data,
            valCxt = [
              [
                names_1.default.instancePath,
                (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath),
              ],
              [names_1.default.parentData, it.parentData],
              [names_1.default.parentDataProperty, it.parentDataProperty],
              [names_1.default.rootData, names_1.default.rootData],
            ];
          it.opts.dynamicRef &&
            valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
          const args = codegen_1._`${dataAndSchema}, ${gen.object(...valCxt)}`;
          return context !== codegen_1.nil
            ? codegen_1._`${func}.call(${context}, ${args})`
            : codegen_1._`${func}(${args})`;
        });
      const newRegExp = codegen_1._`new RegExp`;
      (exports.usePattern = function usePattern({ gen, it: { opts } }, pattern) {
        const u = opts.unicodeRegExp ? 'u' : '',
          { regExp } = opts.code,
          rx = regExp(pattern, u);
        return gen.scopeValue('pattern', {
          key: rx.toString(),
          ref: rx,
          code: codegen_1._`${'new RegExp' === regExp.code ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
        });
      }),
        (exports.validateArray = function validateArray(cxt) {
          const { gen, data, keyword, it } = cxt,
            valid = gen.name('valid');
          if (it.allErrors) {
            const validArr = gen.let('valid', !0);
            return validateItems(() => gen.assign(validArr, !1)), validArr;
          }
          return gen.var(valid, !0), validateItems(() => gen.break()), valid;
          function validateItems(notValid) {
            const len = gen.const('len', codegen_1._`${data}.length`);
            gen.forRange('i', 0, len, (i) => {
              cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid),
                gen.if((0, codegen_1.not)(valid), notValid);
            });
          }
        }),
        (exports.validateUnion = function validateUnion(cxt) {
          const { gen, schema, keyword, it } = cxt;
          if (!Array.isArray(schema)) throw new Error('ajv implementation error');
          if (schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch)) && !it.opts.unevaluated)
            return;
          const valid = gen.let('valid', !1),
            schValid = gen.name('_valid');
          gen.block(() =>
            schema.forEach((_sch, i) => {
              const schCxt = cxt.subschema({ keyword, schemaProp: i, compositeRule: !0 }, schValid);
              gen.assign(valid, codegen_1._`${valid} || ${schValid}`);
              cxt.mergeValidEvaluated(schCxt, schValid) || gen.if((0, codegen_1.not)(valid));
            }),
          ),
            cxt.result(
              valid,
              () => cxt.reset(),
              () => cxt.error(!0),
            );
        });
    },
    '../../../node_modules/ajv/dist/vocabularies/core/id.js': (
      __unused_webpack_module,
      exports,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const def = {
        keyword: 'id',
        code() {
          throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
        },
      };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/core/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const id_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/core/id.js'),
        ref_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/core/ref.js'),
        core = [
          '$schema',
          '$id',
          '$defs',
          '$vocabulary',
          { keyword: '$comment' },
          'definitions',
          id_1.default,
          ref_1.default,
        ];
      exports.default = core;
    },
    '../../../node_modules/ajv/dist/vocabularies/core/ref.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.callRef = exports.getValidate = void 0);
      const ref_error_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/ref_error.js',
        ),
        code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        names_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/names.js'),
        compile_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/index.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: '$ref',
          schemaType: 'string',
          code(cxt) {
            const { gen, schema: $ref, it } = cxt,
              { baseId, schemaEnv: env, validateName, opts, self } = it,
              { root } = env;
            if (('#' === $ref || '#/' === $ref) && baseId === root.baseId)
              return (function callRootRef() {
                if (env === root) return callRef(cxt, validateName, env, env.$async);
                const rootName = gen.scopeValue('root', { ref: root });
                return callRef(cxt, codegen_1._`${rootName}.validate`, root, root.$async);
              })();
            const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
            if (void 0 === schOrEnv)
              throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
            return schOrEnv instanceof compile_1.SchemaEnv
              ? (function callValidate(sch) {
                  const v = getValidate(cxt, sch);
                  callRef(cxt, v, sch, sch.$async);
                })(schOrEnv)
              : (function inlineRefSchema(sch) {
                  const schName = gen.scopeValue(
                      'schema',
                      !0 === opts.code.source
                        ? { ref: sch, code: (0, codegen_1.stringify)(sch) }
                        : { ref: sch },
                    ),
                    valid = gen.name('valid'),
                    schCxt = cxt.subschema(
                      {
                        schema: sch,
                        dataTypes: [],
                        schemaPath: codegen_1.nil,
                        topSchemaRef: schName,
                        errSchemaPath: $ref,
                      },
                      valid,
                    );
                  cxt.mergeEvaluated(schCxt), cxt.ok(valid);
                })(schOrEnv);
          },
        };
      function getValidate(cxt, sch) {
        const { gen } = cxt;
        return sch.validate
          ? gen.scopeValue('validate', { ref: sch.validate })
          : codegen_1._`${gen.scopeValue('wrapper', { ref: sch })}.validate`;
      }
      function callRef(cxt, v, sch, $async) {
        const { gen, it } = cxt,
          { allErrors, schemaEnv: env, opts } = it,
          passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
        function addErrorsFrom(source) {
          const errs = codegen_1._`${source}.errors`;
          gen.assign(
            names_1.default.vErrors,
            codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
          ),
            gen.assign(names_1.default.errors, codegen_1._`${names_1.default.vErrors}.length`);
        }
        function addEvaluatedFrom(source) {
          var _a;
          if (!it.opts.unevaluated) return;
          const schEvaluated =
            null === (_a = null == sch ? void 0 : sch.validate) || void 0 === _a
              ? void 0
              : _a.evaluated;
          if (!0 !== it.props)
            if (schEvaluated && !schEvaluated.dynamicProps)
              void 0 !== schEvaluated.props &&
                (it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props));
            else {
              const props = gen.var('props', codegen_1._`${source}.evaluated.props`);
              it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
            }
          if (!0 !== it.items)
            if (schEvaluated && !schEvaluated.dynamicItems)
              void 0 !== schEvaluated.items &&
                (it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items));
            else {
              const items = gen.var('items', codegen_1._`${source}.evaluated.items`);
              it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
            }
        }
        $async
          ? (function callAsyncRef() {
              if (!env.$async) throw new Error('async schema referenced by sync schema');
              const valid = gen.let('valid');
              gen.try(
                () => {
                  gen.code(codegen_1._`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`),
                    addEvaluatedFrom(v),
                    allErrors || gen.assign(valid, !0);
                },
                (e) => {
                  gen.if(codegen_1._`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e)),
                    addErrorsFrom(e),
                    allErrors || gen.assign(valid, !1);
                },
              ),
                cxt.ok(valid);
            })()
          : (function callSyncRef() {
              cxt.result(
                (0, code_1.callValidateCode)(cxt, v, passCxt),
                () => addEvaluatedFrom(v),
                () => addErrorsFrom(v),
              );
            })();
      }
      (exports.getValidate = getValidate), (exports.callRef = callRef), (exports.default = def);
    },
    '../../../node_modules/ajv/dist/vocabularies/discriminator/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        types_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/discriminator/types.js',
        ),
        compile_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/index.js'),
        ref_error_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/ref_error.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'discriminator',
          type: 'object',
          schemaType: 'object',
          error: {
            message: ({ params: { discrError, tagName } }) =>
              discrError === types_1.DiscrError.Tag
                ? `tag "${tagName}" must be string`
                : `value of tag "${tagName}" must be in oneOf`,
            params: ({ params: { discrError, tag, tagName } }) =>
              codegen_1._`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
          },
          code(cxt) {
            const { gen, data, schema, parentSchema, it } = cxt,
              { oneOf } = parentSchema;
            if (!it.opts.discriminator)
              throw new Error('discriminator: requires discriminator option');
            const tagName = schema.propertyName;
            if ('string' != typeof tagName) throw new Error('discriminator: requires propertyName');
            if (schema.mapping) throw new Error('discriminator: mapping is not supported');
            if (!oneOf) throw new Error('discriminator: requires oneOf keyword');
            const valid = gen.let('valid', !1),
              tag = gen.const('tag', codegen_1._`${data}${(0, codegen_1.getProperty)(tagName)}`);
            function applyTagSchema(schemaProp) {
              const _valid = gen.name('valid'),
                schCxt = cxt.subschema({ keyword: 'oneOf', schemaProp }, _valid);
              return cxt.mergeEvaluated(schCxt, codegen_1.Name), _valid;
            }
            gen.if(
              codegen_1._`typeof ${tag} == "string"`,
              () =>
                (function validateMapping() {
                  const mapping = (function getMapping() {
                    var _a;
                    const oneOfMapping = {},
                      topRequired = hasRequired(parentSchema);
                    let tagRequired = !0;
                    for (let i = 0; i < oneOf.length; i++) {
                      let sch = oneOf[i];
                      if (
                        (null == sch ? void 0 : sch.$ref) &&
                        !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)
                      ) {
                        const ref = sch.$ref;
                        if (
                          ((sch = compile_1.resolveRef.call(
                            it.self,
                            it.schemaEnv.root,
                            it.baseId,
                            ref,
                          )),
                          sch instanceof compile_1.SchemaEnv && (sch = sch.schema),
                          void 0 === sch)
                        )
                          throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
                      }
                      const propSch =
                        null === (_a = null == sch ? void 0 : sch.properties) || void 0 === _a
                          ? void 0
                          : _a[tagName];
                      if ('object' != typeof propSch)
                        throw new Error(
                          `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`,
                        );
                      (tagRequired = tagRequired && (topRequired || hasRequired(sch))),
                        addMappings(propSch, i);
                    }
                    if (!tagRequired)
                      throw new Error(`discriminator: "${tagName}" must be required`);
                    return oneOfMapping;
                    function hasRequired({ required }) {
                      return Array.isArray(required) && required.includes(tagName);
                    }
                    function addMappings(sch, i) {
                      if (sch.const) addMapping(sch.const, i);
                      else {
                        if (!sch.enum)
                          throw new Error(
                            `discriminator: "properties/${tagName}" must have "const" or "enum"`,
                          );
                        for (const tagValue of sch.enum) addMapping(tagValue, i);
                      }
                    }
                    function addMapping(tagValue, i) {
                      if ('string' != typeof tagValue || tagValue in oneOfMapping)
                        throw new Error(
                          `discriminator: "${tagName}" values must be unique strings`,
                        );
                      oneOfMapping[tagValue] = i;
                    }
                  })();
                  gen.if(!1);
                  for (const tagValue in mapping)
                    gen.elseIf(codegen_1._`${tag} === ${tagValue}`),
                      gen.assign(valid, applyTagSchema(mapping[tagValue]));
                  gen.else(),
                    cxt.error(!1, { discrError: types_1.DiscrError.Mapping, tag, tagName }),
                    gen.endIf();
                })(),
              () => cxt.error(!1, { discrError: types_1.DiscrError.Tag, tag, tagName }),
            ),
              cxt.ok(valid);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/discriminator/types.js': (
      __unused_webpack_module,
      exports,
    ) => {
      var DiscrError;
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.DiscrError = void 0),
        (function (DiscrError) {
          (DiscrError.Tag = 'tag'), (DiscrError.Mapping = 'mapping');
        })(DiscrError || (exports.DiscrError = DiscrError = {}));
    },
    '../../../node_modules/ajv/dist/vocabularies/draft7.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const core_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/core/index.js',
        ),
        validation_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/index.js',
        ),
        applicator_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/applicator/index.js',
        ),
        format_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/format/index.js',
        ),
        metadata_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/metadata.js'),
        draft7Vocabularies = [
          core_1.default,
          validation_1.default,
          (0, applicator_1.default)(),
          format_1.default,
          metadata_1.metadataVocabulary,
          metadata_1.contentVocabulary,
        ];
      exports.default = draft7Vocabularies;
    },
    '../../../node_modules/ajv/dist/vocabularies/format/format.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        def = {
          keyword: 'format',
          type: ['number', 'string'],
          schemaType: 'string',
          $data: !0,
          error: {
            message: ({ schemaCode }) => codegen_1.str`must match format "${schemaCode}"`,
            params: ({ schemaCode }) => codegen_1._`{format: ${schemaCode}}`,
          },
          code(cxt, ruleType) {
            const { gen, data, $data, schema, schemaCode, it } = cxt,
              { opts, errSchemaPath, schemaEnv, self } = it;
            opts.validateFormats &&
              ($data
                ? (function validate$DataFormat() {
                    const fmts = gen.scopeValue('formats', {
                        ref: self.formats,
                        code: opts.code.formats,
                      }),
                      fDef = gen.const('fDef', codegen_1._`${fmts}[${schemaCode}]`),
                      fType = gen.let('fType'),
                      format = gen.let('format');
                    gen.if(
                      codegen_1._`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`,
                      () =>
                        gen
                          .assign(fType, codegen_1._`${fDef}.type || "string"`)
                          .assign(format, codegen_1._`${fDef}.validate`),
                      () => gen.assign(fType, codegen_1._`"string"`).assign(format, fDef),
                    ),
                      cxt.fail$data(
                        (0, codegen_1.or)(
                          (function unknownFmt() {
                            return !1 === opts.strictSchema
                              ? codegen_1.nil
                              : codegen_1._`${schemaCode} && !${format}`;
                          })(),
                          (function invalidFmt() {
                            const callFormat = schemaEnv.$async
                                ? codegen_1._`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
                                : codegen_1._`${format}(${data})`,
                              validData = codegen_1._`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
                            return codegen_1._`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
                          })(),
                        ),
                      );
                  })()
                : (function validateFormat() {
                    const formatDef = self.formats[schema];
                    if (!formatDef)
                      return void (function unknownFormat() {
                        if (!1 === opts.strictSchema) return void self.logger.warn(unknownMsg());
                        throw new Error(unknownMsg());
                        function unknownMsg() {
                          return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
                        }
                      })();
                    if (!0 === formatDef) return;
                    const [fmtType, format, fmtRef] = (function getFormat(fmtDef) {
                      const code =
                          fmtDef instanceof RegExp
                            ? (0, codegen_1.regexpCode)(fmtDef)
                            : opts.code.formats
                              ? codegen_1._`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}`
                              : void 0,
                        fmt = gen.scopeValue('formats', { key: schema, ref: fmtDef, code });
                      if ('object' == typeof fmtDef && !(fmtDef instanceof RegExp))
                        return [
                          fmtDef.type || 'string',
                          fmtDef.validate,
                          codegen_1._`${fmt}.validate`,
                        ];
                      return ['string', fmtDef, fmt];
                    })(formatDef);
                    fmtType === ruleType &&
                      cxt.pass(
                        (function validCondition() {
                          if (
                            'object' == typeof formatDef &&
                            !(formatDef instanceof RegExp) &&
                            formatDef.async
                          ) {
                            if (!schemaEnv.$async) throw new Error('async format in sync schema');
                            return codegen_1._`await ${fmtRef}(${data})`;
                          }
                          return 'function' == typeof format
                            ? codegen_1._`${fmtRef}(${data})`
                            : codegen_1._`${fmtRef}.test(${data})`;
                        })(),
                      );
                  })());
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/format/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const format = [
        __webpack_require__('../../../node_modules/ajv/dist/vocabularies/format/format.js').default,
      ];
      exports.default = format;
    },
    '../../../node_modules/ajv/dist/vocabularies/metadata.js': (
      __unused_webpack_module,
      exports,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 }),
        (exports.contentVocabulary = exports.metadataVocabulary = void 0),
        (exports.metadataVocabulary = [
          'title',
          'description',
          'default',
          'deprecated',
          'readOnly',
          'writeOnly',
          'examples',
        ]),
        (exports.contentVocabulary = ['contentMediaType', 'contentEncoding', 'contentSchema']);
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/const.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        equal_1 = __webpack_require__('../../../node_modules/ajv/dist/runtime/equal.js'),
        def = {
          keyword: 'const',
          $data: !0,
          error: {
            message: 'must be equal to constant',
            params: ({ schemaCode }) => codegen_1._`{allowedValue: ${schemaCode}}`,
          },
          code(cxt) {
            const { gen, data, $data, schemaCode, schema } = cxt;
            $data || (schema && 'object' == typeof schema)
              ? cxt.fail$data(
                  codegen_1._`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`,
                )
              : cxt.fail(codegen_1._`${schema} !== ${data}`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/enum.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        equal_1 = __webpack_require__('../../../node_modules/ajv/dist/runtime/equal.js'),
        def = {
          keyword: 'enum',
          schemaType: 'array',
          $data: !0,
          error: {
            message: 'must be equal to one of the allowed values',
            params: ({ schemaCode }) => codegen_1._`{allowedValues: ${schemaCode}}`,
          },
          code(cxt) {
            const { gen, data, $data, schema, schemaCode, it } = cxt;
            if (!$data && 0 === schema.length) throw new Error('enum must have non-empty array');
            const useLoop = schema.length >= it.opts.loopEnum;
            let eql;
            const getEql = () =>
              null != eql ? eql : (eql = (0, util_1.useFunc)(gen, equal_1.default));
            let valid;
            if (useLoop || $data)
              (valid = gen.let('valid')),
                cxt.block$data(valid, function loopEnum() {
                  gen.assign(valid, !1),
                    gen.forOf('v', schemaCode, (v) =>
                      gen.if(codegen_1._`${getEql()}(${data}, ${v})`, () =>
                        gen.assign(valid, !0).break(),
                      ),
                    );
                });
            else {
              if (!Array.isArray(schema)) throw new Error('ajv implementation error');
              const vSchema = gen.const('vSchema', schemaCode);
              valid = (0, codegen_1.or)(
                ...schema.map((_x, i) =>
                  (function equalCode(vSchema, i) {
                    const sch = schema[i];
                    return 'object' == typeof sch && null !== sch
                      ? codegen_1._`${getEql()}(${data}, ${vSchema}[${i}])`
                      : codegen_1._`${data} === ${sch}`;
                  })(vSchema, i),
                ),
              );
            }
            cxt.pass(valid);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/index.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const limitNumber_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/limitNumber.js',
        ),
        multipleOf_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/multipleOf.js',
        ),
        limitLength_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/limitLength.js',
        ),
        pattern_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/pattern.js',
        ),
        limitProperties_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/limitProperties.js',
        ),
        required_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/required.js',
        ),
        limitItems_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/limitItems.js',
        ),
        uniqueItems_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/uniqueItems.js',
        ),
        const_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/const.js',
        ),
        enum_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/vocabularies/validation/enum.js',
        ),
        validation = [
          limitNumber_1.default,
          multipleOf_1.default,
          limitLength_1.default,
          pattern_1.default,
          limitProperties_1.default,
          required_1.default,
          limitItems_1.default,
          uniqueItems_1.default,
          { keyword: 'type', schemaType: ['string', 'array'] },
          { keyword: 'nullable', schemaType: 'boolean' },
          const_1.default,
          enum_1.default,
        ];
      exports.default = validation;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/limitItems.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        def = {
          keyword: ['maxItems', 'minItems'],
          type: 'array',
          schemaType: 'number',
          $data: !0,
          error: {
            message({ keyword, schemaCode }) {
              const comp = 'maxItems' === keyword ? 'more' : 'fewer';
              return codegen_1.str`must NOT have ${comp} than ${schemaCode} items`;
            },
            params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
          },
          code(cxt) {
            const { keyword, data, schemaCode } = cxt,
              op = 'maxItems' === keyword ? codegen_1.operators.GT : codegen_1.operators.LT;
            cxt.fail$data(codegen_1._`${data}.length ${op} ${schemaCode}`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/limitLength.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        ucs2length_1 = __webpack_require__('../../../node_modules/ajv/dist/runtime/ucs2length.js'),
        def = {
          keyword: ['maxLength', 'minLength'],
          type: 'string',
          schemaType: 'number',
          $data: !0,
          error: {
            message({ keyword, schemaCode }) {
              const comp = 'maxLength' === keyword ? 'more' : 'fewer';
              return codegen_1.str`must NOT have ${comp} than ${schemaCode} characters`;
            },
            params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
          },
          code(cxt) {
            const { keyword, data, schemaCode, it } = cxt,
              op = 'maxLength' === keyword ? codegen_1.operators.GT : codegen_1.operators.LT,
              len =
                !1 === it.opts.unicode
                  ? codegen_1._`${data}.length`
                  : codegen_1._`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
            cxt.fail$data(codegen_1._`${len} ${op} ${schemaCode}`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/limitNumber.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        ops = codegen_1.operators,
        KWDs = {
          maximum: { okStr: '<=', ok: ops.LTE, fail: ops.GT },
          minimum: { okStr: '>=', ok: ops.GTE, fail: ops.LT },
          exclusiveMaximum: { okStr: '<', ok: ops.LT, fail: ops.GTE },
          exclusiveMinimum: { okStr: '>', ok: ops.GT, fail: ops.LTE },
        },
        error = {
          message: ({ keyword, schemaCode }) =>
            codegen_1.str`must be ${KWDs[keyword].okStr} ${schemaCode}`,
          params: ({ keyword, schemaCode }) =>
            codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
        },
        def = {
          keyword: Object.keys(KWDs),
          type: 'number',
          schemaType: 'number',
          $data: !0,
          error,
          code(cxt) {
            const { keyword, data, schemaCode } = cxt;
            cxt.fail$data(
              codegen_1._`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`,
            );
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/limitProperties.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        def = {
          keyword: ['maxProperties', 'minProperties'],
          type: 'object',
          schemaType: 'number',
          $data: !0,
          error: {
            message({ keyword, schemaCode }) {
              const comp = 'maxProperties' === keyword ? 'more' : 'fewer';
              return codegen_1.str`must NOT have ${comp} than ${schemaCode} properties`;
            },
            params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
          },
          code(cxt) {
            const { keyword, data, schemaCode } = cxt,
              op = 'maxProperties' === keyword ? codegen_1.operators.GT : codegen_1.operators.LT;
            cxt.fail$data(codegen_1._`Object.keys(${data}).length ${op} ${schemaCode}`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/multipleOf.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const codegen_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/codegen/index.js',
        ),
        def = {
          keyword: 'multipleOf',
          type: 'number',
          schemaType: 'number',
          $data: !0,
          error: {
            message: ({ schemaCode }) => codegen_1.str`must be multiple of ${schemaCode}`,
            params: ({ schemaCode }) => codegen_1._`{multipleOf: ${schemaCode}}`,
          },
          code(cxt) {
            const { gen, data, schemaCode, it } = cxt,
              prec = it.opts.multipleOfPrecision,
              res = gen.let('res'),
              invalid = prec
                ? codegen_1._`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
                : codegen_1._`${res} !== parseInt(${res})`;
            cxt.fail$data(
              codegen_1._`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`,
            );
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/pattern.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        def = {
          keyword: 'pattern',
          type: 'string',
          schemaType: 'string',
          $data: !0,
          error: {
            message: ({ schemaCode }) => codegen_1.str`must match pattern "${schemaCode}"`,
            params: ({ schemaCode }) => codegen_1._`{pattern: ${schemaCode}}`,
          },
          code(cxt) {
            const { data, $data, schema, schemaCode, it } = cxt,
              u = it.opts.unicodeRegExp ? 'u' : '',
              regExp = $data
                ? codegen_1._`(new RegExp(${schemaCode}, ${u}))`
                : (0, code_1.usePattern)(cxt, schema);
            cxt.fail$data(codegen_1._`!${regExp}.test(${data})`);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/required.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const code_1 = __webpack_require__('../../../node_modules/ajv/dist/vocabularies/code.js'),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        def = {
          keyword: 'required',
          type: 'object',
          schemaType: 'array',
          $data: !0,
          error: {
            message: ({ params: { missingProperty } }) =>
              codegen_1.str`must have required property '${missingProperty}'`,
            params: ({ params: { missingProperty } }) =>
              codegen_1._`{missingProperty: ${missingProperty}}`,
          },
          code(cxt) {
            const { gen, schema, schemaCode, data, $data, it } = cxt,
              { opts } = it;
            if (!$data && 0 === schema.length) return;
            const useLoop = schema.length >= opts.loopRequired;
            if (
              (it.allErrors
                ? (function allErrorsMode() {
                    if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
                    else for (const prop of schema) (0, code_1.checkReportMissingProp)(cxt, prop);
                  })()
                : (function exitOnErrorMode() {
                    const missing = gen.let('missing');
                    if (useLoop || $data) {
                      const valid = gen.let('valid', !0);
                      cxt.block$data(valid, () =>
                        (function loopUntilMissing(missing, valid) {
                          cxt.setParams({ missingProperty: missing }),
                            gen.forOf(
                              missing,
                              schemaCode,
                              () => {
                                gen.assign(
                                  valid,
                                  (0, code_1.propertyInData)(
                                    gen,
                                    data,
                                    missing,
                                    opts.ownProperties,
                                  ),
                                ),
                                  gen.if((0, codegen_1.not)(valid), () => {
                                    cxt.error(), gen.break();
                                  });
                              },
                              codegen_1.nil,
                            );
                        })(missing, valid),
                      ),
                        cxt.ok(valid);
                    } else
                      gen.if((0, code_1.checkMissingProp)(cxt, schema, missing)),
                        (0, code_1.reportMissingProp)(cxt, missing),
                        gen.else();
                  })(),
              opts.strictRequired)
            ) {
              const props = cxt.parentSchema.properties,
                { definedProperties } = cxt.it;
              for (const requiredKey of schema)
                if (
                  void 0 === (null == props ? void 0 : props[requiredKey]) &&
                  !definedProperties.has(requiredKey)
                ) {
                  const msg = `required property "${requiredKey}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
                  (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
                }
            }
            function loopAllRequired() {
              gen.forOf('prop', schemaCode, (prop) => {
                cxt.setParams({ missingProperty: prop }),
                  gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () =>
                    cxt.error(),
                  );
              });
            }
          },
        };
      exports.default = def;
    },
    '../../../node_modules/ajv/dist/vocabularies/validation/uniqueItems.js': (
      __unused_webpack_module,
      exports,
      __webpack_require__,
    ) => {
      Object.defineProperty(exports, '__esModule', { value: !0 });
      const dataType_1 = __webpack_require__(
          '../../../node_modules/ajv/dist/compile/validate/dataType.js',
        ),
        codegen_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/codegen/index.js'),
        util_1 = __webpack_require__('../../../node_modules/ajv/dist/compile/util.js'),
        equal_1 = __webpack_require__('../../../node_modules/ajv/dist/runtime/equal.js'),
        def = {
          keyword: 'uniqueItems',
          type: 'array',
          schemaType: 'boolean',
          $data: !0,
          error: {
            message: ({ params: { i, j } }) =>
              codegen_1.str`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
            params: ({ params: { i, j } }) => codegen_1._`{i: ${i}, j: ${j}}`,
          },
          code(cxt) {
            const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
            if (!$data && !schema) return;
            const valid = gen.let('valid'),
              itemTypes = parentSchema.items
                ? (0, dataType_1.getSchemaTypes)(parentSchema.items)
                : [];
            function loopN(i, j) {
              const item = gen.name('item'),
                wrongType = (0, dataType_1.checkDataTypes)(
                  itemTypes,
                  item,
                  it.opts.strictNumbers,
                  dataType_1.DataType.Wrong,
                ),
                indices = gen.const('indices', codegen_1._`{}`);
              gen.for(codegen_1._`;${i}--;`, () => {
                gen.let(item, codegen_1._`${data}[${i}]`),
                  gen.if(wrongType, codegen_1._`continue`),
                  itemTypes.length > 1 &&
                    gen.if(codegen_1._`typeof ${item} == "string"`, codegen_1._`${item} += "_"`),
                  gen
                    .if(codegen_1._`typeof ${indices}[${item}] == "number"`, () => {
                      gen.assign(j, codegen_1._`${indices}[${item}]`),
                        cxt.error(),
                        gen.assign(valid, !1).break();
                    })
                    .code(codegen_1._`${indices}[${item}] = ${i}`);
              });
            }
            function loopN2(i, j) {
              const eql = (0, util_1.useFunc)(gen, equal_1.default),
                outer = gen.name('outer');
              gen.label(outer).for(codegen_1._`;${i}--;`, () =>
                gen.for(codegen_1._`${j} = ${i}; ${j}--;`, () =>
                  gen.if(codegen_1._`${eql}(${data}[${i}], ${data}[${j}])`, () => {
                    cxt.error(), gen.assign(valid, !1).break(outer);
                  }),
                ),
              );
            }
            cxt.block$data(
              valid,
              function validateUniqueItems() {
                const i = gen.let('i', codegen_1._`${data}.length`),
                  j = gen.let('j');
                cxt.setParams({ i, j }),
                  gen.assign(valid, !0),
                  gen.if(codegen_1._`${i} > 1`, () =>
                    ((function canOptimize() {
                      return (
                        itemTypes.length > 0 &&
                        !itemTypes.some((t) => 'object' === t || 'array' === t)
                      );
                    })()
                      ? loopN
                      : loopN2)(i, j),
                  );
              },
              codegen_1._`${schemaCode} === false`,
            ),
              cxt.ok(valid);
          },
        };
      exports.default = def;
    },
    '../../../node_modules/fast-deep-equal/index.js': (module) => {
      module.exports = function equal(a, b) {
        if (a === b) return !0;
        if (a && b && 'object' == typeof a && 'object' == typeof b) {
          if (a.constructor !== b.constructor) return !1;
          var length, i, keys;
          if (Array.isArray(a)) {
            if ((length = a.length) != b.length) return !1;
            for (i = length; 0 != i--; ) if (!equal(a[i], b[i])) return !1;
            return !0;
          }
          if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
          if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
          if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
          if ((length = (keys = Object.keys(a)).length) !== Object.keys(b).length) return !1;
          for (i = length; 0 != i--; )
            if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return !1;
          for (i = length; 0 != i--; ) {
            var key = keys[i];
            if (!equal(a[key], b[key])) return !1;
          }
          return !0;
        }
        return a != a && b != b;
      };
    },
    '../../../node_modules/fast-uri/index.js': (
      module,
      __unused_webpack_exports,
      __webpack_require__,
    ) => {
      const {
          normalizeIPv6,
          normalizeIPv4,
          removeDotSegments,
          recomposeAuthority,
          normalizeComponentEncoding,
        } = __webpack_require__('../../../node_modules/fast-uri/lib/utils.js'),
        SCHEMES = __webpack_require__('../../../node_modules/fast-uri/lib/schemes.js');
      function resolveComponents(base, relative, options, skipNormalization) {
        const target = {};
        return (
          skipNormalization ||
            ((base = parse(serialize(base, options), options)),
            (relative = parse(serialize(relative, options), options))),
          !(options = options || {}).tolerant && relative.scheme
            ? ((target.scheme = relative.scheme),
              (target.userinfo = relative.userinfo),
              (target.host = relative.host),
              (target.port = relative.port),
              (target.path = removeDotSegments(relative.path || '')),
              (target.query = relative.query))
            : (void 0 !== relative.userinfo || void 0 !== relative.host || void 0 !== relative.port
                ? ((target.userinfo = relative.userinfo),
                  (target.host = relative.host),
                  (target.port = relative.port),
                  (target.path = removeDotSegments(relative.path || '')),
                  (target.query = relative.query))
                : (relative.path
                    ? ('/' === relative.path.charAt(0)
                        ? (target.path = removeDotSegments(relative.path))
                        : ((void 0 === base.userinfo &&
                            void 0 === base.host &&
                            void 0 === base.port) ||
                          base.path
                            ? base.path
                              ? (target.path =
                                  base.path.slice(0, base.path.lastIndexOf('/') + 1) +
                                  relative.path)
                              : (target.path = relative.path)
                            : (target.path = '/' + relative.path),
                          (target.path = removeDotSegments(target.path))),
                      (target.query = relative.query))
                    : ((target.path = base.path),
                      void 0 !== relative.query
                        ? (target.query = relative.query)
                        : (target.query = base.query)),
                  (target.userinfo = base.userinfo),
                  (target.host = base.host),
                  (target.port = base.port)),
              (target.scheme = base.scheme)),
          (target.fragment = relative.fragment),
          target
        );
      }
      function serialize(cmpts, opts) {
        const components = {
            host: cmpts.host,
            scheme: cmpts.scheme,
            userinfo: cmpts.userinfo,
            port: cmpts.port,
            path: cmpts.path,
            query: cmpts.query,
            nid: cmpts.nid,
            nss: cmpts.nss,
            uuid: cmpts.uuid,
            fragment: cmpts.fragment,
            reference: cmpts.reference,
            resourceName: cmpts.resourceName,
            secure: cmpts.secure,
            error: '',
          },
          options = Object.assign({}, opts),
          uriTokens = [],
          schemeHandler = SCHEMES[(options.scheme || components.scheme || '').toLowerCase()];
        schemeHandler && schemeHandler.serialize && schemeHandler.serialize(components, options),
          void 0 !== components.path &&
            (options.skipEscape
              ? (components.path = unescape(components.path))
              : ((components.path = escape(components.path)),
                void 0 !== components.scheme &&
                  (components.path = components.path.split('%3A').join(':')))),
          'suffix' !== options.reference &&
            components.scheme &&
            (uriTokens.push(components.scheme), uriTokens.push(':'));
        const authority = recomposeAuthority(components, options);
        if (
          (void 0 !== authority &&
            ('suffix' !== options.reference && uriTokens.push('//'),
            uriTokens.push(authority),
            components.path && '/' !== components.path.charAt(0) && uriTokens.push('/')),
          void 0 !== components.path)
        ) {
          let s = components.path;
          options.absolutePath ||
            (schemeHandler && schemeHandler.absolutePath) ||
            (s = removeDotSegments(s)),
            void 0 === authority && (s = s.replace(/^\/\//u, '/%2F')),
            uriTokens.push(s);
        }
        return (
          void 0 !== components.query && (uriTokens.push('?'), uriTokens.push(components.query)),
          void 0 !== components.fragment &&
            (uriTokens.push('#'), uriTokens.push(components.fragment)),
          uriTokens.join('')
        );
      }
      const hexLookUp = Array.from({ length: 127 }, (v, k) =>
        /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(k)),
      );
      const URI_PARSE =
        /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
      function parse(uri, opts) {
        const options = Object.assign({}, opts),
          parsed = {
            scheme: void 0,
            userinfo: void 0,
            host: '',
            port: void 0,
            path: '',
            query: void 0,
            fragment: void 0,
          },
          gotEncoding = -1 !== uri.indexOf('%');
        let isIP = !1;
        'suffix' === options.reference &&
          (uri = (options.scheme ? options.scheme + ':' : '') + '//' + uri);
        const matches = uri.match(URI_PARSE);
        if (matches) {
          if (
            ((parsed.scheme = matches[1]),
            (parsed.userinfo = matches[3]),
            (parsed.host = matches[4]),
            (parsed.port = parseInt(matches[5], 10)),
            (parsed.path = matches[6] || ''),
            (parsed.query = matches[7]),
            (parsed.fragment = matches[8]),
            isNaN(parsed.port) && (parsed.port = matches[5]),
            parsed.host)
          ) {
            const ipv4result = normalizeIPv4(parsed.host);
            if (!1 === ipv4result.isIPV4) {
              const ipv6result = normalizeIPv6(ipv4result.host, { isIPV4: !1 });
              (parsed.host = ipv6result.host.toLowerCase()), (isIP = ipv6result.isIPV6);
            } else (parsed.host = ipv4result.host), (isIP = !0);
          }
          void 0 !== parsed.scheme ||
          void 0 !== parsed.userinfo ||
          void 0 !== parsed.host ||
          void 0 !== parsed.port ||
          parsed.path ||
          void 0 !== parsed.query
            ? void 0 === parsed.scheme
              ? (parsed.reference = 'relative')
              : void 0 === parsed.fragment
                ? (parsed.reference = 'absolute')
                : (parsed.reference = 'uri')
            : (parsed.reference = 'same-document'),
            options.reference &&
              'suffix' !== options.reference &&
              options.reference !== parsed.reference &&
              (parsed.error = parsed.error || 'URI is not a ' + options.reference + ' reference.');
          const schemeHandler = SCHEMES[(options.scheme || parsed.scheme || '').toLowerCase()];
          if (
            !(options.unicodeSupport || (schemeHandler && schemeHandler.unicodeSupport)) &&
            parsed.host &&
            (options.domainHost || (schemeHandler && schemeHandler.domainHost)) &&
            !1 === isIP &&
            (function nonSimpleDomain(value) {
              let code = 0;
              for (let i = 0, len = value.length; i < len; ++i)
                if (((code = value.charCodeAt(i)), code > 126 || hexLookUp[code])) return !0;
              return !1;
            })(parsed.host)
          )
            try {
              parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
            } catch (e) {
              parsed.error =
                parsed.error || "Host's domain name can not be converted to ASCII: " + e;
            }
          (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) &&
            (gotEncoding && void 0 !== parsed.scheme && (parsed.scheme = unescape(parsed.scheme)),
            gotEncoding &&
              void 0 !== parsed.userinfo &&
              (parsed.userinfo = unescape(parsed.userinfo)),
            gotEncoding && void 0 !== parsed.host && (parsed.host = unescape(parsed.host)),
            void 0 !== parsed.path &&
              parsed.path.length &&
              (parsed.path = escape(unescape(parsed.path))),
            void 0 !== parsed.fragment &&
              parsed.fragment.length &&
              (parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment)))),
            schemeHandler && schemeHandler.parse && schemeHandler.parse(parsed, options);
        } else parsed.error = parsed.error || 'URI can not be parsed.';
        return parsed;
      }
      const fastUri = {
        SCHEMES,
        normalize: function normalize(uri, options) {
          return (
            'string' == typeof uri
              ? (uri = serialize(parse(uri, options), options))
              : 'object' == typeof uri && (uri = parse(serialize(uri, options), options)),
            uri
          );
        },
        resolve: function resolve(baseURI, relativeURI, options) {
          const schemelessOptions = Object.assign({ scheme: 'null' }, options);
          return serialize(
            resolveComponents(
              parse(baseURI, schemelessOptions),
              parse(relativeURI, schemelessOptions),
              schemelessOptions,
              !0,
            ),
            { ...schemelessOptions, skipEscape: !0 },
          );
        },
        resolveComponents,
        equal: function equal(uriA, uriB, options) {
          return (
            'string' == typeof uriA
              ? ((uriA = unescape(uriA)),
                (uriA = serialize(normalizeComponentEncoding(parse(uriA, options), !0), {
                  ...options,
                  skipEscape: !0,
                })))
              : 'object' == typeof uriA &&
                (uriA = serialize(normalizeComponentEncoding(uriA, !0), {
                  ...options,
                  skipEscape: !0,
                })),
            'string' == typeof uriB
              ? ((uriB = unescape(uriB)),
                (uriB = serialize(normalizeComponentEncoding(parse(uriB, options), !0), {
                  ...options,
                  skipEscape: !0,
                })))
              : 'object' == typeof uriB &&
                (uriB = serialize(normalizeComponentEncoding(uriB, !0), {
                  ...options,
                  skipEscape: !0,
                })),
            uriA.toLowerCase() === uriB.toLowerCase()
          );
        },
        serialize,
        parse,
      };
      (module.exports = fastUri),
        (module.exports.default = fastUri),
        (module.exports.fastUri = fastUri);
    },
    '../../../node_modules/fast-uri/lib/schemes.js': (module) => {
      const UUID_REG = /^[\da-f]{8}\b-[\da-f]{4}\b-[\da-f]{4}\b-[\da-f]{4}\b-[\da-f]{12}$/iu,
        URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
      function isSecure(wsComponents) {
        return 'boolean' == typeof wsComponents.secure
          ? wsComponents.secure
          : 'wss' === String(wsComponents.scheme).toLowerCase();
      }
      function httpParse(components) {
        return (
          components.host || (components.error = components.error || 'HTTP URIs must have a host.'),
          components
        );
      }
      function httpSerialize(components) {
        const secure = 'https' === String(components.scheme).toLowerCase();
        return (
          (components.port !== (secure ? 443 : 80) && '' !== components.port) ||
            (components.port = void 0),
          components.path || (components.path = '/'),
          components
        );
      }
      const http = { scheme: 'http', domainHost: !0, parse: httpParse, serialize: httpSerialize },
        ws = {
          scheme: 'ws',
          domainHost: !0,
          parse: function wsParse(wsComponents) {
            return (
              (wsComponents.secure = isSecure(wsComponents)),
              (wsComponents.resourceName =
                (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '')),
              (wsComponents.path = void 0),
              (wsComponents.query = void 0),
              wsComponents
            );
          },
          serialize: function wsSerialize(wsComponents) {
            if (
              ((wsComponents.port !== (isSecure(wsComponents) ? 443 : 80) &&
                '' !== wsComponents.port) ||
                (wsComponents.port = void 0),
              'boolean' == typeof wsComponents.secure &&
                ((wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws'),
                (wsComponents.secure = void 0)),
              wsComponents.resourceName)
            ) {
              const [path, query] = wsComponents.resourceName.split('?');
              (wsComponents.path = path && '/' !== path ? path : void 0),
                (wsComponents.query = query),
                (wsComponents.resourceName = void 0);
            }
            return (wsComponents.fragment = void 0), wsComponents;
          },
        },
        SCHEMES = {
          http,
          https: {
            scheme: 'https',
            domainHost: http.domainHost,
            parse: httpParse,
            serialize: httpSerialize,
          },
          ws,
          wss: {
            scheme: 'wss',
            domainHost: ws.domainHost,
            parse: ws.parse,
            serialize: ws.serialize,
          },
          urn: {
            scheme: 'urn',
            parse: function urnParse(urnComponents, options) {
              if (!urnComponents.path)
                return (urnComponents.error = 'URN can not be parsed'), urnComponents;
              const matches = urnComponents.path.match(URN_REG);
              if (matches) {
                const scheme = options.scheme || urnComponents.scheme || 'urn';
                (urnComponents.nid = matches[1].toLowerCase()), (urnComponents.nss = matches[2]);
                const urnScheme = `${scheme}:${options.nid || urnComponents.nid}`,
                  schemeHandler = SCHEMES[urnScheme];
                (urnComponents.path = void 0),
                  schemeHandler && (urnComponents = schemeHandler.parse(urnComponents, options));
              } else urnComponents.error = urnComponents.error || 'URN can not be parsed.';
              return urnComponents;
            },
            serialize: function urnSerialize(urnComponents, options) {
              const scheme = options.scheme || urnComponents.scheme || 'urn',
                nid = urnComponents.nid.toLowerCase(),
                urnScheme = `${scheme}:${options.nid || nid}`,
                schemeHandler = SCHEMES[urnScheme];
              schemeHandler && (urnComponents = schemeHandler.serialize(urnComponents, options));
              const uriComponents = urnComponents,
                nss = urnComponents.nss;
              return (
                (uriComponents.path = `${nid || options.nid}:${nss}`),
                (options.skipEscape = !0),
                uriComponents
              );
            },
            skipNormalize: !0,
          },
          'urn:uuid': {
            scheme: 'urn:uuid',
            parse: function urnuuidParse(urnComponents, options) {
              const uuidComponents = urnComponents;
              return (
                (uuidComponents.uuid = uuidComponents.nss),
                (uuidComponents.nss = void 0),
                options.tolerant ||
                  (uuidComponents.uuid && UUID_REG.test(uuidComponents.uuid)) ||
                  (uuidComponents.error = uuidComponents.error || 'UUID is not valid.'),
                uuidComponents
              );
            },
            serialize: function urnuuidSerialize(uuidComponents) {
              const urnComponents = uuidComponents;
              return (urnComponents.nss = (uuidComponents.uuid || '').toLowerCase()), urnComponents;
            },
            skipNormalize: !0,
          },
        };
      module.exports = SCHEMES;
    },
    '../../../node_modules/fast-uri/lib/scopedChars.js': (module) => {
      module.exports = {
        HEX: {
          0: 0,
          1: 1,
          2: 2,
          3: 3,
          4: 4,
          5: 5,
          6: 6,
          7: 7,
          8: 8,
          9: 9,
          a: 10,
          A: 10,
          b: 11,
          B: 11,
          c: 12,
          C: 12,
          d: 13,
          D: 13,
          e: 14,
          E: 14,
          f: 15,
          F: 15,
        },
      };
    },
    '../../../node_modules/fast-uri/lib/utils.js': (
      module,
      __unused_webpack_exports,
      __webpack_require__,
    ) => {
      const { HEX } = __webpack_require__('../../../node_modules/fast-uri/lib/scopedChars.js');
      function normalizeIPv4(host) {
        if (findToken(host, '.') < 3) return { host, isIPV4: !1 };
        const matches =
            host.match(
              /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/u,
            ) || [],
          [address] = matches;
        return address
          ? { host: stripLeadingZeros(address, '.'), isIPV4: !0 }
          : { host, isIPV4: !1 };
      }
      function stringArrayToHexStripped(input, keepZero = !1) {
        let acc = '',
          strip = !0;
        for (const c of input) {
          if (void 0 === HEX[c]) return;
          '0' !== c && !0 === strip && (strip = !1), strip || (acc += c);
        }
        return keepZero && 0 === acc.length && (acc = '0'), acc;
      }
      function normalizeIPv6(host, opts = {}) {
        if (findToken(host, ':') < 2) return { host, isIPV6: !1 };
        const ipv6 = (function getIPV6(input) {
          let tokenCount = 0;
          const output = { error: !1, address: '', zone: '' },
            address = [],
            buffer = [];
          let isZone = !1,
            endipv6Encountered = !1,
            endIpv6 = !1;
          function consume() {
            if (buffer.length) {
              if (!1 === isZone) {
                const hex = stringArrayToHexStripped(buffer);
                if (void 0 === hex) return (output.error = !0), !1;
                address.push(hex);
              }
              buffer.length = 0;
            }
            return !0;
          }
          for (let i = 0; i < input.length; i++) {
            const cursor = input[i];
            if ('[' !== cursor && ']' !== cursor)
              if (':' !== cursor)
                if ('%' === cursor) {
                  if (!consume()) break;
                  isZone = !0;
                } else buffer.push(cursor);
              else {
                if ((!0 === endipv6Encountered && (endIpv6 = !0), !consume())) break;
                if ((tokenCount++, address.push(':'), tokenCount > 7)) {
                  output.error = !0;
                  break;
                }
                i - 1 >= 0 && ':' === input[i - 1] && (endipv6Encountered = !0);
              }
          }
          return (
            buffer.length &&
              (isZone
                ? (output.zone = buffer.join(''))
                : endIpv6
                  ? address.push(buffer.join(''))
                  : address.push(stringArrayToHexStripped(buffer))),
            (output.address = address.join('')),
            output
          );
        })(host);
        if (ipv6.error) return { host, isIPV6: !1 };
        {
          let newHost = ipv6.address,
            escapedHost = ipv6.address;
          return (
            ipv6.zone && ((newHost += '%' + ipv6.zone), (escapedHost += '%25' + ipv6.zone)),
            { host: newHost, escapedHost, isIPV6: !0 }
          );
        }
      }
      function stripLeadingZeros(str, token) {
        let out = '',
          skip = !0;
        const l = str.length;
        for (let i = 0; i < l; i++) {
          const c = str[i];
          '0' === c && skip
            ? ((i + 1 <= l && str[i + 1] === token) || i + 1 === l) && ((out += c), (skip = !1))
            : ((skip = c === token), (out += c));
        }
        return out;
      }
      function findToken(str, token) {
        let ind = 0;
        for (let i = 0; i < str.length; i++) str[i] === token && ind++;
        return ind;
      }
      const RDS1 = /^\.\.?\//u,
        RDS2 = /^\/\.(?:\/|$)/u,
        RDS3 = /^\/\.\.(?:\/|$)/u,
        RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/u;
      module.exports = {
        recomposeAuthority: function recomposeAuthority(components, options) {
          const uriTokens = [];
          if (
            (void 0 !== components.userinfo &&
              (uriTokens.push(components.userinfo), uriTokens.push('@')),
            void 0 !== components.host)
          ) {
            let host = unescape(components.host);
            const ipV4res = normalizeIPv4(host);
            if (ipV4res.isIPV4) host = ipV4res.host;
            else {
              const ipV6res = normalizeIPv6(ipV4res.host, { isIPV4: !1 });
              host = !0 === ipV6res.isIPV6 ? `[${ipV6res.escapedHost}]` : components.host;
            }
            uriTokens.push(host);
          }
          return (
            ('number' != typeof components.port && 'string' != typeof components.port) ||
              (uriTokens.push(':'), uriTokens.push(String(components.port))),
            uriTokens.length ? uriTokens.join('') : void 0
          );
        },
        normalizeComponentEncoding: function normalizeComponentEncoding(components, esc) {
          const func = !0 !== esc ? escape : unescape;
          return (
            void 0 !== components.scheme && (components.scheme = func(components.scheme)),
            void 0 !== components.userinfo && (components.userinfo = func(components.userinfo)),
            void 0 !== components.host && (components.host = func(components.host)),
            void 0 !== components.path && (components.path = func(components.path)),
            void 0 !== components.query && (components.query = func(components.query)),
            void 0 !== components.fragment && (components.fragment = func(components.fragment)),
            components
          );
        },
        removeDotSegments: function removeDotSegments(input) {
          const output = [];
          for (; input.length; )
            if (input.match(RDS1)) input = input.replace(RDS1, '');
            else if (input.match(RDS2)) input = input.replace(RDS2, '/');
            else if (input.match(RDS3)) (input = input.replace(RDS3, '/')), output.pop();
            else if ('.' === input || '..' === input) input = '';
            else {
              const im = input.match(RDS5);
              if (!im) throw new Error('Unexpected dot segment condition');
              {
                const s = im[0];
                (input = input.slice(s.length)), output.push(s);
              }
            }
          return output.join('');
        },
        normalizeIPv4,
        normalizeIPv6,
        stringArrayToHexStripped,
      };
    },
    '../../../node_modules/json-schema-traverse/index.js': (module) => {
      var traverse = (module.exports = function (schema, opts, cb) {
        'function' == typeof opts && ((cb = opts), (opts = {})),
          _traverse(
            opts,
            'function' == typeof (cb = opts.cb || cb) ? cb : cb.pre || function () {},
            cb.post || function () {},
            schema,
            '',
            schema,
          );
      });
      function _traverse(
        opts,
        pre,
        post,
        schema,
        jsonPtr,
        rootSchema,
        parentJsonPtr,
        parentKeyword,
        parentSchema,
        keyIndex,
      ) {
        if (schema && 'object' == typeof schema && !Array.isArray(schema)) {
          for (var key in (pre(
            schema,
            jsonPtr,
            rootSchema,
            parentJsonPtr,
            parentKeyword,
            parentSchema,
            keyIndex,
          ),
          schema)) {
            var sch = schema[key];
            if (Array.isArray(sch)) {
              if (key in traverse.arrayKeywords)
                for (var i = 0; i < sch.length; i++)
                  _traverse(
                    opts,
                    pre,
                    post,
                    sch[i],
                    jsonPtr + '/' + key + '/' + i,
                    rootSchema,
                    jsonPtr,
                    key,
                    schema,
                    i,
                  );
            } else if (key in traverse.propsKeywords) {
              if (sch && 'object' == typeof sch)
                for (var prop in sch)
                  _traverse(
                    opts,
                    pre,
                    post,
                    sch[prop],
                    jsonPtr + '/' + key + '/' + prop.replace(/~/g, '~0').replace(/\//g, '~1'),
                    rootSchema,
                    jsonPtr,
                    key,
                    schema,
                    prop,
                  );
            } else
              (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) &&
                _traverse(
                  opts,
                  pre,
                  post,
                  sch,
                  jsonPtr + '/' + key,
                  rootSchema,
                  jsonPtr,
                  key,
                  schema,
                );
          }
          post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        }
      }
      (traverse.keywords = {
        additionalItems: !0,
        items: !0,
        contains: !0,
        additionalProperties: !0,
        propertyNames: !0,
        not: !0,
        if: !0,
        then: !0,
        else: !0,
      }),
        (traverse.arrayKeywords = { items: !0, allOf: !0, anyOf: !0, oneOf: !0 }),
        (traverse.propsKeywords = {
          $defs: !0,
          definitions: !0,
          properties: !0,
          patternProperties: !0,
          dependencies: !0,
        }),
        (traverse.skipKeywords = {
          default: !0,
          enum: !0,
          const: !0,
          required: !0,
          maximum: !0,
          minimum: !0,
          exclusiveMaximum: !0,
          exclusiveMinimum: !0,
          multipleOf: !0,
          maxLength: !0,
          minLength: !0,
          pattern: !0,
          format: !0,
          maxItems: !0,
          minItems: !0,
          uniqueItems: !0,
          maxProperties: !0,
          minProperties: !0,
        });
    },
    '../../../node_modules/uuid/dist/esm-browser/v4.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { A: () => esm_browser_v4 });
      const esm_browser_native = {
        randomUUID:
          'undefined' != typeof crypto && crypto.randomUUID && crypto.randomUUID.bind(crypto),
      };
      var getRandomValues,
        rnds8 = new Uint8Array(16);
      function rng() {
        if (
          !getRandomValues &&
          !(getRandomValues =
            'undefined' != typeof crypto &&
            crypto.getRandomValues &&
            crypto.getRandomValues.bind(crypto))
        )
          throw new Error(
            'crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported',
          );
        return getRandomValues(rnds8);
      }
      for (var byteToHex = [], i = 0; i < 256; ++i) byteToHex.push((i + 256).toString(16).slice(1));
      function unsafeStringify(arr, offset = 0) {
        return (
          byteToHex[arr[offset + 0]] +
          byteToHex[arr[offset + 1]] +
          byteToHex[arr[offset + 2]] +
          byteToHex[arr[offset + 3]] +
          '-' +
          byteToHex[arr[offset + 4]] +
          byteToHex[arr[offset + 5]] +
          '-' +
          byteToHex[arr[offset + 6]] +
          byteToHex[arr[offset + 7]] +
          '-' +
          byteToHex[arr[offset + 8]] +
          byteToHex[arr[offset + 9]] +
          '-' +
          byteToHex[arr[offset + 10]] +
          byteToHex[arr[offset + 11]] +
          byteToHex[arr[offset + 12]] +
          byteToHex[arr[offset + 13]] +
          byteToHex[arr[offset + 14]] +
          byteToHex[arr[offset + 15]]
        ).toLowerCase();
      }
      const esm_browser_v4 = function v4(options, buf, offset) {
        if (esm_browser_native.randomUUID && !buf && !options)
          return esm_browser_native.randomUUID();
        var rnds = (options = options || {}).random || (options.rng || rng)();
        if (((rnds[6] = (15 & rnds[6]) | 64), (rnds[8] = (63 & rnds[8]) | 128), buf)) {
          offset = offset || 0;
          for (var i = 0; i < 16; ++i) buf[offset + i] = rnds[i];
          return buf;
        }
        return unsafeStringify(rnds);
      };
    },
    '../../../node_modules/ajv/dist/refs/data.json': (module) => {
      module.exports = JSON.parse(
        '{"$id":"https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#","description":"Meta-schema for $data reference (JSON AnySchema extension proposal)","type":"object","required":["$data"],"properties":{"$data":{"type":"string","anyOf":[{"format":"relative-json-pointer"},{"format":"json-pointer"}]}},"additionalProperties":false}',
      );
    },
    '../../../node_modules/ajv/dist/refs/json-schema-draft-07.json': (module) => {
      module.exports = JSON.parse(
        '{"$schema":"http://json-schema.org/draft-07/schema#","$id":"http://json-schema.org/draft-07/schema#","title":"Core schema meta-schema","definitions":{"schemaArray":{"type":"array","minItems":1,"items":{"$ref":"#"}},"nonNegativeInteger":{"type":"integer","minimum":0},"nonNegativeIntegerDefault0":{"allOf":[{"$ref":"#/definitions/nonNegativeInteger"},{"default":0}]},"simpleTypes":{"enum":["array","boolean","integer","null","number","object","string"]},"stringArray":{"type":"array","items":{"type":"string"},"uniqueItems":true,"default":[]}},"type":["object","boolean"],"properties":{"$id":{"type":"string","format":"uri-reference"},"$schema":{"type":"string","format":"uri"},"$ref":{"type":"string","format":"uri-reference"},"$comment":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"default":true,"readOnly":{"type":"boolean","default":false},"examples":{"type":"array","items":true},"multipleOf":{"type":"number","exclusiveMinimum":0},"maximum":{"type":"number"},"exclusiveMaximum":{"type":"number"},"minimum":{"type":"number"},"exclusiveMinimum":{"type":"number"},"maxLength":{"$ref":"#/definitions/nonNegativeInteger"},"minLength":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"pattern":{"type":"string","format":"regex"},"additionalItems":{"$ref":"#"},"items":{"anyOf":[{"$ref":"#"},{"$ref":"#/definitions/schemaArray"}],"default":true},"maxItems":{"$ref":"#/definitions/nonNegativeInteger"},"minItems":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"uniqueItems":{"type":"boolean","default":false},"contains":{"$ref":"#"},"maxProperties":{"$ref":"#/definitions/nonNegativeInteger"},"minProperties":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"required":{"$ref":"#/definitions/stringArray"},"additionalProperties":{"$ref":"#"},"definitions":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"properties":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"patternProperties":{"type":"object","additionalProperties":{"$ref":"#"},"propertyNames":{"format":"regex"},"default":{}},"dependencies":{"type":"object","additionalProperties":{"anyOf":[{"$ref":"#"},{"$ref":"#/definitions/stringArray"}]}},"propertyNames":{"$ref":"#"},"const":true,"enum":{"type":"array","items":true,"minItems":1,"uniqueItems":true},"type":{"anyOf":[{"$ref":"#/definitions/simpleTypes"},{"type":"array","items":{"$ref":"#/definitions/simpleTypes"},"minItems":1,"uniqueItems":true}]},"format":{"type":"string"},"contentMediaType":{"type":"string"},"contentEncoding":{"type":"string"},"if":{"$ref":"#"},"then":{"$ref":"#"},"else":{"$ref":"#"},"allOf":{"$ref":"#/definitions/schemaArray"},"anyOf":{"$ref":"#/definitions/schemaArray"},"oneOf":{"$ref":"#/definitions/schemaArray"},"not":{"$ref":"#"}},"default":true}',
      );
    },
  },
]);
//# sourceMappingURL=8157.99c40fec.iframe.bundle.js.map
