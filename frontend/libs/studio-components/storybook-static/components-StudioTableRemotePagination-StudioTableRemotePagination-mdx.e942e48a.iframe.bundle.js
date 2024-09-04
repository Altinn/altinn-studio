'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [5273, 9115],
  {
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
    './src/components/StudioTableRemotePagination/StudioTableRemotePagination.mdx': (
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
        _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_6__ =
          __webpack_require__(
            '../../../node_modules/@storybook/addon-docs/node_modules/@mdx-js/react/lib/index.js',
          ),
        _storybook_blocks__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
          '../../../node_modules/@storybook/addon-docs/node_modules/@storybook/blocks/dist/index.mjs',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _StudioTableRemotePagination_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/StudioTableRemotePagination.stories.tsx',
        );
      __webpack_require__(
        './src/components/StudioTableRemotePagination/StudioTableRemotePagination.tsx',
      ),
        __webpack_require__('./src/components/StudioTableRemotePagination/mockData.tsx'),
        __webpack_require__(
          './src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css',
        );
      function _createMdxContent(props) {
        const _components = {
          code: 'code',
          p: 'p',
          pre: 'pre',
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_6__.R)(),
          ...props.components,
        };
        return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
          react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,
          {
            children: [
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_7__.W8,
                { of: _StudioTableRemotePagination_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioTableRemotePagination',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_9__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                    _components.p,
                    {
                      children: [
                        "StudioTableRemotePagination brings together Digdir Designsystemet's ",
                        (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                          children: 'Table',
                        }),
                        ' and ',
                        (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                          children: 'Pagination',
                        }),
                        '\ncomponents. This component is useful when data is retrieved in chunks, and the pagination logic is\nmanaged externally.',
                      ],
                    },
                  ),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_7__.Hl,
                { of: _StudioTableRemotePagination_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__.D,
                {
                  level: 2,
                  size: 'xsmall',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'Column format',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)('ul', {
                children: [
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)('li', {
                    children: [
                      'The columns prop has two required properties: ',
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                        children: 'accessor',
                      }),
                      ' and ',
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                        children: 'heading',
                      }),
                      '.',
                    ],
                  }),
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)('li', {
                    children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
                      _components.p,
                      {
                        children: [
                          'These properties are optional: ',
                          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                            _components.code,
                            { children: 'sortable' },
                          ),
                          ', ',
                          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                            _components.code,
                            { children: 'headerCellClass' },
                          ),
                          ', ',
                          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                            _components.code,
                            { children: 'bodyCellClass' },
                          ),
                          ' and\n',
                          (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                            _components.code,
                            { children: 'bodyCellFormatter' },
                          ),
                          '.',
                        ],
                      },
                    ),
                  }),
                ],
              }),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.pre, {
                children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _components.code,
                  {
                    className: 'language-tsx',
                    children:
                      "const columns = [\n  {\n    accessor: 'icon',\n    heading: '',\n  },\n  {\n    accessor: 'name',\n    heading: 'Name',\n    sortable: true,\n  },\n  {\n    accessor: 'creator',\n    heading: 'Created by',\n  },\n  {\n    accessor: 'lastChanged',\n    heading: 'Last changed',\n    sortable: true,\n    headerCellClass: classes.lastChangedColumnWidth,\n    bodyCellClass: 'someOtherCustomClass',\n    bodyCellFormatter: (date) => formatDateDDMMYYYY(date),\n  },\n];\n",
                  },
                ),
              }),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__.D,
                {
                  level: 2,
                  size: 'xsmall',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'Row format',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)('ul', {
                children: [
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)('li', {
                    children: [
                      'Rows must have an ',
                      (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.code, {
                        children: 'id',
                      }),
                      ' that is unique.',
                    ],
                  }),
                  (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)('li', {
                    children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                      _components.p,
                      {
                        children:
                          'The accessors in the columns array is used to display the row properties. Therefore, each\nproperty name has to exactly match the accessor.',
                      },
                    ),
                  }),
                ],
              }),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.pre, {
                children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                  _components.code,
                  {
                    className: 'language-tsx',
                    children:
                      "const rows = [\n  {\n    id: 1,\n    icon: <IconButton icon={<StarFillIcon />} />,\n    name: 'Coordinated register notification',\n    creator: 'Brønnøysund Register Centre',\n    lastChanged: '2023-04-12',\n  },\n  {\n    id: 2,\n    icon: <IconButton icon={<StarFillIcon />} />,\n    name: 'Application for authorisation and license as a healthcare personnel',\n    creator: 'The Norwegian Directorate of Health',\n    lastChanged: '2023-04-05',\n  },\n];\n",
                  },
                ),
              }),
            ],
          },
        );
      }
      function MDXContent(props = {}) {
        const { wrapper: MDXLayout } = {
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_6__.R)(),
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
