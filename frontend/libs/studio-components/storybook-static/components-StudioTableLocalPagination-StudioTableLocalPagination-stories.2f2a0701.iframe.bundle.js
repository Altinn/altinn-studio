'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6527],
  {
    './src/components/StudioTableLocalPagination/StudioTableLocalPagination.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { S: () => StudioTableLocalPagination });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/index.ts',
        ),
        _hooks_useTableSorting__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/hooks/useTableSorting.tsx',
        ),
        _StudioTableRemotePagination_utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/utils.tsx',
        );
      const StudioTableLocalPagination = (0, react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
        (
          {
            columns,
            rows,
            size = 'medium',
            isLoading = !1,
            loadingText,
            emptyTableFallback,
            pagination,
          },
          ref,
        ) => {
          const [currentPage, setCurrentPage] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(1),
            [pageSize, setPageSize] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
              pagination?.pageSizeOptions[0] ?? void 0,
            ),
            isSortable = columns.some((column) => column.sortable),
            { handleSorting, sortedRows } = (0,
            _hooks_useTableSorting__WEBPACK_IMPORTED_MODULE_2__.M)(rows, { enable: isSortable }),
            initialRowsToRender = (0,
            _StudioTableRemotePagination_utils__WEBPACK_IMPORTED_MODULE_3__.J)(
              currentPage,
              pageSize,
              rows,
            ),
            [rowsToRender, setRowsToRender] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
              initialRowsToRender,
            );
          (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
            const newRowsToRender = (0,
            _StudioTableRemotePagination_utils__WEBPACK_IMPORTED_MODULE_3__.J)(
              currentPage,
              pageSize,
              sortedRows || rows,
            );
            setRowsToRender(newRowsToRender);
          }, [sortedRows, rows, currentPage, pageSize]);
          const totalRows = rows.length,
            totalPages = Math.ceil(totalRows / pageSize),
            studioTableRemotePaginationProps = pagination && {
              ...pagination,
              pageSize,
              currentPage,
              totalPages,
              totalRows,
              onPageChange: setCurrentPage,
              onPageSizeChange: setPageSize,
            };
          return react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_1__.P,
            {
              columns,
              rows: rowsToRender,
              size,
              isLoading,
              loadingText,
              emptyTableFallback,
              onSortClick: handleSorting,
              pagination: studioTableRemotePaginationProps,
              ref,
            },
          );
        },
      );
      (StudioTableLocalPagination.displayName = 'StudioTableLocalPagination'),
        (StudioTableLocalPagination.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioTableLocalPagination',
          props: {
            size: { defaultValue: { value: "'medium'", computed: !1 }, required: !1 },
            isLoading: { defaultValue: { value: 'false', computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioTableRemotePagination/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        P: () => _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_0__.P,
      });
      var _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioTableRemotePagination/StudioTableRemotePagination.tsx',
      );
    },
    './src/components/StudioTableLocalPagination/StudioTableLocalPagination.stories.tsx': (
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
        _StudioTableLocalPagination__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTableLocalPagination/StudioTableLocalPagination.tsx',
        ),
        _StudioTableRemotePagination_mockData__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/mockData.tsx',
        );
      const meta = {
          title: 'StudioTableLocalPagination',
          component: _StudioTableLocalPagination__WEBPACK_IMPORTED_MODULE_1__.S,
          argTypes: {
            columns: { description: 'An array of objects representing the table columns.' },
            rows: { description: 'An array of objects representing the table rows.' },
            size: {
              control: 'radio',
              options: ['small', 'medium', 'large'],
              description: 'The size of the table.',
            },
            emptyTableMessage: { description: 'The message to display when the table is empty.' },
            pagination: {
              description:
                'An object containing pagination-related props. If not provided, pagination is hidden.',
            },
          },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioTableLocalPagination__WEBPACK_IMPORTED_MODULE_1__.S,
            {
              columns: _StudioTableRemotePagination_mockData__WEBPACK_IMPORTED_MODULE_2__.YB,
              rows: _StudioTableRemotePagination_mockData__WEBPACK_IMPORTED_MODULE_2__.Ge,
              size: args.size,
              emptyTableFallback: 'No data found',
              pagination: {
                pageSizeOptions: [5, 10, 20, 50],
                paginationTexts: {
                  pageSizeLabel: 'Rows per page:',
                  totalRowsText: 'Total number of rows:',
                  nextButtonAriaLabel: 'Next',
                  previousButtonAriaLabel: 'Previous',
                  numberButtonAriaLabel: (num) => `Page ${num}`,
                },
              },
            },
          ),
        __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              "args => {\n  const paginationTexts: PaginationTexts = {\n    pageSizeLabel: 'Rows per page:',\n    totalRowsText: 'Total number of rows:',\n    nextButtonAriaLabel: 'Next',\n    previousButtonAriaLabel: 'Previous',\n    numberButtonAriaLabel: num => `Page ${num}`\n  };\n  return <StudioTableLocalPagination columns={columns} rows={rows} size={args.size} emptyTableFallback={'No data found'} pagination={{\n    pageSizeOptions: [5, 10, 20, 50],\n    paginationTexts\n  }} />;\n}",
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
