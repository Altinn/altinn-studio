'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [9115],
  {
    './src/components/StudioTableRemotePagination/StudioTableRemotePagination.stories.tsx': (
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
        _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/StudioTableRemotePagination.tsx',
        ),
        _mockData__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/mockData.tsx',
        ),
        _hooks_useTableSorting__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
          './src/hooks/useTableSorting.tsx',
        ),
        _utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/utils.tsx',
        );
      const meta = {
          title: 'StudioTableRemotePagination',
          component: _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_1__.P,
          argTypes: {
            columns: { description: 'An array of objects representing the table columns.' },
            rows: { description: 'An array of objects representing the table rows.' },
            size: {
              control: 'radio',
              options: ['small', 'medium', 'large'],
              description: 'The size of the table.',
            },
            emptyTableMessage: { description: 'The message to display when the table is empty.' },
            onSortClick: {
              description:
                'Function to be invoked when a sortable column header is clicked. If not provided, sorting buttons are hidden.',
            },
            pagination: {
              description:
                'An object containing pagination-related props. If not provided, pagination is hidden.',
            },
          },
        },
        Preview = (args) => {
          const [currentPage, setCurrentPage] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(1),
            [pageSize, setPageSize] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(5),
            { handleSorting, sortedRows } = (0,
            _hooks_useTableSorting__WEBPACK_IMPORTED_MODULE_3__.M)(
              _mockData__WEBPACK_IMPORTED_MODULE_2__.Ge,
              { enable: !0 },
            ),
            rowsToRender = (0, _utils__WEBPACK_IMPORTED_MODULE_4__.J)(
              currentPage,
              pageSize,
              sortedRows || _mockData__WEBPACK_IMPORTED_MODULE_2__.Ge,
            ),
            totalRows = _mockData__WEBPACK_IMPORTED_MODULE_2__.Ge.length,
            totalPages = Math.ceil(totalRows / pageSize);
          !rowsToRender.length && totalRows && setCurrentPage(1);
          const paginationProps = {
            currentPage,
            totalPages,
            totalRows,
            pageSize,
            pageSizeOptions: [5, 10, 20, 50],
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            paginationTexts: {
              pageSizeLabel: 'Rows per page:',
              totalRowsText: 'Total number of rows:',
              nextButtonAriaLabel: 'Next',
              previousButtonAriaLabel: 'Previous',
              numberButtonAriaLabel: (num) => `Page ${num}`,
            },
          };
          return react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioTableRemotePagination__WEBPACK_IMPORTED_MODULE_1__.P,
            {
              columns: _mockData__WEBPACK_IMPORTED_MODULE_2__.YB,
              rows: rowsToRender,
              size: args.size,
              emptyTableFallback: 'No data found',
              onSortClick: handleSorting,
              pagination: paginationProps,
            },
          );
        },
        __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              "args => {\n  // Example of external logic\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const [pageSize, setPageSize] = useState<number>(5);\n  const {\n    handleSorting,\n    sortedRows\n  } = useTableSorting(rows, {\n    enable: true\n  });\n  const rowsToRender = getRowsToRender(currentPage, pageSize, sortedRows || rows);\n  const totalRows = rows.length;\n  const totalPages = Math.ceil(totalRows / pageSize);\n\n  // Fallback to page 1 if the current page is out of bounds\n  if (!rowsToRender.length && totalRows) {\n    setCurrentPage(1);\n  }\n  const paginationTexts: PaginationTexts = {\n    pageSizeLabel: 'Rows per page:',\n    totalRowsText: 'Total number of rows:',\n    nextButtonAriaLabel: 'Next',\n    previousButtonAriaLabel: 'Previous',\n    numberButtonAriaLabel: num => `Page ${num}`\n  };\n  const paginationProps: RemotePaginationProps = {\n    currentPage,\n    totalPages,\n    totalRows,\n    pageSize,\n    pageSizeOptions: [5, 10, 20, 50],\n    onPageChange: setCurrentPage,\n    onPageSizeChange: setPageSize,\n    paginationTexts\n  };\n  return <StudioTableRemotePagination columns={columns} rows={rowsToRender} size={args.size} emptyTableFallback={'No data found'} onSortClick={handleSorting} pagination={paginationProps} />;\n}",
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
