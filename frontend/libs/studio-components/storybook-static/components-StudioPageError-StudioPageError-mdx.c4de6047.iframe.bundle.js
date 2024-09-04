/*! For license information please see components-StudioPageError-StudioPageError-mdx.c4de6047.iframe.bundle.js.LICENSE.txt */
'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [8597, 8031],
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Table/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { XI: () => Table_Table });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        );
      const Table = react.forwardRef(
        ({ zebra = !1, stickyHeader = !1, border = !1, className, children, ...rest }, ref) => {
          const size = (0, getSize.Y)(rest.size || 'md');
          return (0, jsx_runtime.jsx)(Paragraph.f, {
            asChild: !0,
            size,
            children: (0, jsx_runtime.jsx)('table', {
              ref,
              className: (0, lite.$)(
                'fds-table',
                `fds-table--${size}`,
                zebra && 'fds-table--zebra',
                stickyHeader && 'fds-table--sticky-header',
                border && 'fds-table--border',
                className,
              ),
              ...rest,
              children,
            }),
          });
        },
      );
      Table.displayName = 'Table';
      const TableHead = react.forwardRef(({ className, children, ...rest }, ref) =>
        (0, jsx_runtime.jsx)('thead', {
          ref,
          className: (0, lite.$)('fds-table__head', className),
          ...rest,
          children,
        }),
      );
      TableHead.displayName = 'TableHead';
      const TableBody = react.forwardRef(({ children, ...rest }, ref) =>
        (0, jsx_runtime.jsx)('tbody', { ref, ...rest, children }),
      );
      TableBody.displayName = 'TableBody';
      const TableRow = react.forwardRef(({ className, children, ...rest }, ref) =>
        (0, jsx_runtime.jsx)('tr', {
          className: (0, lite.$)('fds-table__row', className),
          ref,
          ...rest,
          children,
        }),
      );
      TableRow.displayName = 'TableRow';
      const TableCell = react.forwardRef(({ className, children, ...rest }, ref) =>
        (0, jsx_runtime.jsx)('td', {
          ref,
          className: (0, lite.$)('fds-table__cell', className),
          ...rest,
          children,
        }),
      );
      TableCell.displayName = 'TableCell';
      var ChevronUp = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronUp.js',
        ),
        ChevronDown = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronDown.js',
        ),
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
      const ChevronUpDown = (0, react.forwardRef)((_a, ref) => {
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
                d: 'M12.53 4.47a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06L12 6.06l2.97 2.97a.75.75 0 1 0 1.06-1.06l-3.5-3.5Zm-3.5 10.5a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 1 0-1.06-1.06L12 17.94l-2.97-2.97Z',
                fill: 'currentColor',
              }),
            )
          );
        }),
        SORT_ICON = {
          ascending: (0, jsx_runtime.jsx)(ChevronUp.A, {}),
          descending: (0, jsx_runtime.jsx)(ChevronDown.A, {}),
        },
        TableHeaderCell = react.forwardRef(
          ({ sortable = !1, sort, onSortClick, className, children, ...rest }, ref) => {
            const sortIcon =
              'ascending' === sort || 'descending' === sort
                ? SORT_ICON[sort]
                : (0, jsx_runtime.jsx)(ChevronUpDown, {});
            return (0, jsx_runtime.jsxs)('th', {
              className: (0, lite.$)(
                'fds-table__header__cell',
                sortable && 'fds-table__header__cell--sortable',
                sort && 'fds-table__header__cell--sorted',
                className,
              ),
              'aria-sort': sort,
              ref,
              ...rest,
              children: [
                sortable &&
                  (0, jsx_runtime.jsxs)('button', {
                    className: 'fds-focus',
                    onClick: onSortClick,
                    children: [children, sortIcon],
                  }),
                !sortable && children,
              ],
            });
          },
        );
      TableHeaderCell.displayName = 'TableHeaderCell';
      const Table_Table = Table;
      (Table_Table.Head = TableHead),
        (Table_Table.Body = TableBody),
        (Table_Table.Row = TableRow),
        (Table_Table.Cell = TableCell),
        (Table_Table.HeaderCell = TableHeaderCell),
        (Table_Table.displayName = 'Table'),
        (Table_Table.Head.displayName = 'Table.Head'),
        (Table_Table.Body.displayName = 'Table.Body'),
        (Table_Table.Row.displayName = 'Table.Row'),
        (Table_Table.Cell.displayName = 'Table.Cell'),
        (Table_Table.HeaderCell.displayName = 'Table.HeaderCell');
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
    '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronDown.js':
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
                  d: 'M5.97 9.47a.75.75 0 0 1 1.06 0L12 14.44l4.97-4.97a.75.75 0 1 1 1.06 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-5.5-5.5a.75.75 0 0 1 0-1.06Z',
                  fill: 'currentColor',
                }),
              )
            );
          },
        );
      },
    '../../../node_modules/@digdir/designsystemet-react/node_modules/@navikt/aksel-icons/dist/react/esm/ChevronUp.js':
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
                  d: 'M11.47 7.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 1 1-1.06 1.06L12 9.56l-4.97 4.97a.75.75 0 0 1-1.06-1.06l5.5-5.5Z',
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
    './src/components/StudioPageError/StudioPageError.mdx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
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
        _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
          '../../../node_modules/@storybook/addon-docs/node_modules/@storybook/blocks/dist/index.mjs',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Table/index.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _StudioPageError_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioPageError/StudioPageError.stories.tsx',
        );
      function _createMdxContent(props) {
        const _components = {
          code: 'code',
          p: 'p',
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_3__.R)(),
          ...props.components,
        };
        return (
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI ||
            _missingMdxReference('Table', !1),
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Body ||
            _missingMdxReference('Table.Body', !0),
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Cell ||
            _missingMdxReference('Table.Cell', !0),
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Head ||
            _missingMdxReference('Table.Head', !0),
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.HeaderCell ||
            _missingMdxReference('Table.HeaderCell', !0),
          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row ||
            _missingMdxReference('Table.Row', !0),
          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
            react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,
            {
              children: [
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__.W8,
                  { of: _StudioPageError_stories__WEBPACK_IMPORTED_MODULE_2__ },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.D,
                  {
                    level: 1,
                    size: 'small',
                    children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                      _components.p,
                      { children: 'StudioPageError' },
                    ),
                  },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__.f,
                  {
                    children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                      _components.p,
                      {
                        children: [
                          'The ',
                          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                            _components.code,
                            { children: 'StudioPageError' },
                          ),
                          ' component is used to display error messages on a page. It includes an alert\nbox with a title and a message.',
                        ],
                      },
                    ),
                  },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.D,
                  {
                    level: 2,
                    size: 'small',
                    children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                      _components.p,
                      { children: 'Props' },
                    ),
                  },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__.f,
                  {
                    children: [
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                        children: 'StudioPageError',
                      }),
                      ' component has two props:',
                    ],
                  },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI,
                  {
                    size: 'sm',
                    children: [
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Head,
                        {
                          children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                            _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row,
                            {
                              children: [
                                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                    .HeaderCell,
                                  { children: 'Name' },
                                ),
                                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                    .HeaderCell,
                                  { children: 'Description' },
                                ),
                              ],
                            },
                          ),
                        },
                      ),
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Body,
                        {
                          children: [
                            (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                              _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row,
                              {
                                children: [
                                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                    _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                      .Cell,
                                    {
                                      children: (0,
                                      react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                        _components.code,
                                        { children: 'title' },
                                      ),
                                    },
                                  ),
                                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                    _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                      .Cell,
                                    {
                                      children:
                                        'A string representing the title of the error message.',
                                    },
                                  ),
                                ],
                              },
                            ),
                            (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                              _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row,
                              {
                                children: [
                                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                    _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                      .Cell,
                                    {
                                      children: (0,
                                      react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                        _components.code,
                                        { children: 'message' },
                                      ),
                                    },
                                  ),
                                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                                    _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI
                                      .Cell,
                                    {
                                      children: 'A string representing the error message content.',
                                    },
                                  ),
                                ],
                              },
                            ),
                          ],
                        },
                      ),
                    ],
                  },
                ),
                '\n',
                (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__.Hl,
                  { of: _StudioPageError_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
                ),
              ],
            },
          )
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
      function _missingMdxReference(id, component) {
        throw new Error(
          'Expected ' +
            (component ? 'component' : 'object') +
            ' `' +
            id +
            '` to be defined: you likely forgot to import, pass, or provide it.',
        );
      }
    },
    '../../../node_modules/@storybook/addon-docs/node_modules/@mdx-js/react/lib/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
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
    './src/components/StudioPageError/StudioPageError.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { C: () => StudioPageError });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        Alert = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Alert/Alert.js',
        ),
        Heading = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
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
        StudioPageError_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioPageError/StudioPageError.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioPageError_module.A, options);
      const StudioPageError_StudioPageError_module =
          StudioPageError_module.A && StudioPageError_module.A.locals
            ? StudioPageError_module.A.locals
            : void 0,
        StudioPageError = ({ message, title }) => {
          const isReactNode = react.isValidElement(message);
          return react.createElement(
            'div',
            { className: StudioPageError_StudioPageError_module.container },
            react.createElement(
              Alert.F,
              {
                className: StudioPageError_StudioPageError_module.alertContent,
                severity: 'danger',
              },
              react.createElement(Heading.D, { level: 1, size: 'xs', spacing: !0 }, title),
              isReactNode
                ? react.createElement(react.Fragment, null, message)
                : react.createElement(Paragraph.f, null, message),
            ),
          );
        };
      StudioPageError.__docgenInfo = {
        description: '',
        methods: [],
        displayName: 'StudioPageError',
        props: {
          title: { required: !1, tsType: { name: 'string' }, description: '' },
          message: {
            required: !1,
            tsType: {
              name: 'union',
              raw: 'string | React.ReactNode',
              elements: [{ name: 'string' }, { name: 'ReactReactNode', raw: 'React.ReactNode' }],
            },
            description: '',
          },
        },
      };
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioPageError/StudioPageError.module.css':
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
          '.nGdjMcrEFjuBdt6_vg6A {\n  max-width: 700px;\n  margin: var(--fds-spacing-12) auto 0;\n  margin-top: 50px;\n}\n\n.ORDh6reJzwe2rcs_2X3l {\n  font-family: var(--studio-font-family);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioPageError/StudioPageError.module.css'],
            names: [],
            mappings: 'AAAA;EACE,gBAAgB;EAChB,oCAAoC;EACpC,gBAAgB;AAClB;;AAEA;EACE,sCAAsC;AACxC',
            sourcesContent: [
              '.container {\n  max-width: 700px;\n  margin: var(--fds-spacing-12) auto 0;\n  margin-top: 50px;\n}\n\n.alertContent {\n  font-family: var(--studio-font-family);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            container: 'nGdjMcrEFjuBdt6_vg6A',
            alertContent: 'ORDh6reJzwe2rcs_2X3l',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioPageError/StudioPageError.stories.tsx': (
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
        _StudioPageError__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioPageError/StudioPageError.tsx',
        );
      const meta = {
          title: 'StudioPageError',
          component: _StudioPageError__WEBPACK_IMPORTED_MODULE_1__.C,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioPageError__WEBPACK_IMPORTED_MODULE_1__.C,
            args,
          );
      Preview.args = { title: 'Alert title', message: 'Alert message' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              '(args): React.ReactElement => {\n  return <StudioPageError {...args} />;\n}',
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
