'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [2199],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Pagination/index.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { dK: () => Pagination_Pagination });
      var jsx_runtime = __webpack_require__('../../../node_modules/react/jsx-runtime.js'),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        lite = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
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
      const ChevronLeft = (0, react.forwardRef)((_a, ref) => {
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
              d: 'M14.53 5.97a.75.75 0 0 1 0 1.06L9.56 12l4.97 4.97a.75.75 0 1 1-1.06 1.06l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 0Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var ChevronRight_rest = function (s, e) {
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
      const ChevronRight = (0, react.forwardRef)((_a, ref) => {
        var { title, titleId: _titleId } = _a,
          props = ChevronRight_rest(_a, ['title', 'titleId']);
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
              d: 'M9.47 5.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06L14.44 12 9.47 7.03a.75.75 0 0 1 0-1.06Z',
              fill: 'currentColor',
            }),
          )
        );
      });
      var getSize = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        ),
        dist = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
        );
      const PaginationContext = (0, react.createContext)({ size: 'md', compact: !1 }),
        PaginationRoot = (0, react.forwardRef)(({ asChild, compact = !1, ...rest }, ref) => {
          const Component = asChild ? dist.D : 'nav',
            size = (0, getSize.Y)(rest.size || 'md');
          return (0, jsx_runtime.jsx)(PaginationContext.Provider, {
            value: { size, compact },
            children: (0, jsx_runtime.jsx)(Component, { ref, 'aria-label': 'Pagination', ...rest }),
          });
        });
      var PaginationRoot$1 = PaginationRoot;
      const PaginationContent = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
          const Component = asChild ? dist.D : 'ul',
            { size } = (0, react.useContext)(PaginationContext);
          return (0, jsx_runtime.jsx)(Component, {
            ref,
            className: (0, lite.$)('fds-pagination', `fds-pagination--${size}`, className),
            ...rest,
          });
        }),
        PaginationItem = (0, react.forwardRef)(({ asChild, className, ...rest }, ref) => {
          const Component = asChild ? dist.D : 'li',
            { size, compact } = (0, react.useContext)(PaginationContext);
          return (0, jsx_runtime.jsx)(Component, {
            ref,
            className: (0, lite.$)(
              'fds-pagination__item',
              `fds-pagination--${size}`,
              compact && 'fds-pagination--compact',
              className,
            ),
            ...rest,
          });
        });
      var PaginationItem$1 = PaginationItem,
        Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        );
      const PaginationButton = (0, react.forwardRef)(({ isActive, ...rest }, ref) => {
        const { size } = (0, react.useContext)(PaginationContext);
        return (0, jsx_runtime.jsx)(Button.$, {
          ref,
          variant: isActive ? 'primary' : 'tertiary',
          'aria-current': isActive,
          color: 'first',
          size,
          ...rest,
        });
      });
      var Paragraph = __webpack_require__(
        '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
      );
      const PaginationEllipsis = (0, react.forwardRef)(({ className, ...rest }, ref) => {
        const { size } = (0, react.useContext)(PaginationContext);
        return (0, jsx_runtime.jsx)(Paragraph.f, {
          ref,
          className: (0, lite.$)('fds-pagination__ellipsis', className),
          size,
          ...rest,
          children: '…',
        });
      });
      var PaginationEllipsis$1 = PaginationEllipsis;
      const PaginationNext = (0, react.forwardRef)(({ ...rest }, ref) =>
          (0, jsx_runtime.jsx)(PaginationButton, {
            ref,
            'aria-label': null != rest.children ? void 0 : 'Neste side',
            ...rest,
          }),
        ),
        PaginationPrevious = (0, react.forwardRef)(({ ...rest }, ref) =>
          (0, jsx_runtime.jsx)(PaginationButton, {
            ref,
            'aria-label': null != rest.children ? void 0 : 'Forrige side',
            ...rest,
          }),
        ),
        usePagination = ({ totalPages, currentPage: currentPageProps = 1, compact }) => {
          const [currentPage, setCurrentPage] = (0, react.useState)(currentPageProps);
          (0, react.useEffect)(() => {
            setCurrentPage(currentPageProps);
          }, [currentPageProps]);
          const pages = (({ compact, currentPage, totalPages }) => {
            const siblingCount = compact ? 0 : 1,
              range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
            if (totalPages <= 2 * (1 + siblingCount) + 3) return range(1, totalPages);
            const startPages = range(1, 1),
              endPages = range(totalPages - 1 + 1, totalPages),
              siblingsStart = Math.max(
                Math.min(currentPage - siblingCount, totalPages - 1 - 2 * siblingCount - 1),
                3,
              ),
              siblingsEnd = siblingsStart + 2 * siblingCount;
            return [
              ...startPages,
              siblingsStart - (startPages[startPages.length - 1] ?? 0) == 2
                ? siblingsStart - 1
                : 'ellipsis',
              ...range(siblingsStart, siblingsEnd),
              (endPages[0] ?? totalPages + 1) - siblingsEnd == 2 ? siblingsEnd + 1 : 'ellipsis',
              ...endPages,
            ];
          })({ currentPage, totalPages, compact });
          return {
            pages,
            currentPage,
            setCurrentPage,
            previousPage: () => {
              setCurrentPage(currentPage - 1 > 0 ? currentPage - 1 : 1);
            },
            nextPage: () => {
              setCurrentPage(currentPage + 1 <= totalPages ? currentPage + 1 : totalPages);
            },
            totalPages,
            showNextPage: currentPage < totalPages,
            showPreviousPage: 1 !== currentPage,
          };
        },
        iconSize = { sm: '1rem', md: '1.5rem', lg: '2rem' },
        Pagination = (0, react.forwardRef)(
          (
            {
              nextLabel = '',
              previousLabel = '',
              compact = !1,
              hideLabels = !1,
              currentPage = 1,
              totalPages,
              onChange,
              itemLabel = (num) => `Side ${num}`,
              ...rest
            },
            ref,
          ) => {
            const { pages, showNextPage, showPreviousPage } = usePagination({
                compact,
                currentPage,
                totalPages,
              }),
              size = (0, getSize.Y)(rest.size || 'md');
            return (0, jsx_runtime.jsx)(PaginationRoot, {
              ref,
              'aria-label': 'Pagination',
              size,
              compact,
              ...rest,
              children: (0, jsx_runtime.jsxs)(PaginationContent, {
                children: [
                  (0, jsx_runtime.jsx)(PaginationItem, {
                    children: (0, jsx_runtime.jsxs)(PaginationPrevious, {
                      className: (0, lite.$)(!showPreviousPage && 'fds-pagination--hidden'),
                      onClick: () => {
                        onChange(currentPage - 1);
                      },
                      'aria-label': previousLabel,
                      children: [
                        (0, jsx_runtime.jsx)(ChevronLeft, {
                          'aria-hidden': !0,
                          fontSize: iconSize[size],
                        }),
                        !hideLabels && previousLabel,
                      ],
                    }),
                  }),
                  pages.map((page, i) =>
                    (0, jsx_runtime.jsx)(
                      PaginationItem,
                      {
                        children:
                          'ellipsis' === page
                            ? (0, jsx_runtime.jsx)(PaginationEllipsis, {})
                            : (0, jsx_runtime.jsx)(PaginationButton, {
                                'aria-current': currentPage === page,
                                isActive: currentPage === page,
                                'aria-label': itemLabel(page),
                                onClick: () => {
                                  onChange(page);
                                },
                                children: page,
                              }),
                      },
                      `${page}${i}`,
                    ),
                  ),
                  (0, jsx_runtime.jsx)(PaginationItem, {
                    children: (0, jsx_runtime.jsxs)(PaginationNext, {
                      'aria-label': nextLabel,
                      onClick: () => {
                        onChange(currentPage + 1);
                      },
                      className: (0, lite.$)(!showNextPage && 'fds-pagination--hidden'),
                      children: [
                        !hideLabels && nextLabel,
                        (0, jsx_runtime.jsx)(ChevronRight, {
                          'aria-hidden': !0,
                          fontSize: iconSize[size],
                        }),
                      ],
                    }),
                  }),
                ],
              }),
            });
          },
        );
      Pagination.displayName = 'Pagination';
      const Pagination_Pagination = Pagination;
      (Pagination_Pagination.Root = PaginationRoot$1),
        (Pagination_Pagination.Content = PaginationContent),
        (Pagination_Pagination.Item = PaginationItem$1),
        (Pagination_Pagination.Button = PaginationButton),
        (Pagination_Pagination.Ellipsis = PaginationEllipsis$1),
        (Pagination_Pagination.Previous = PaginationPrevious),
        (Pagination_Pagination.Next = PaginationNext),
        (Pagination_Pagination.Root.displayName = 'Pagination.Root'),
        (Pagination_Pagination.Content.displayName = 'Pagination.Content'),
        (Pagination_Pagination.Item.displayName = 'Pagination.Item'),
        (Pagination_Pagination.Button.displayName = 'Pagination.Button'),
        (Pagination_Pagination.Ellipsis.displayName = 'Pagination.Ellipsis'),
        (Pagination_Pagination.Previous.displayName = 'Pagination.Previous'),
        (Pagination_Pagination.Next.displayName = 'Pagination.Next');
    },
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
  },
]);
