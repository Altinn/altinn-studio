'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [9349, 6527],
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
    './src/components/StudioTableLocalPagination/StudioTableLocalPagination.mdx': (
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
        _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            '../../../node_modules/@storybook/addon-docs/node_modules/@mdx-js/react/lib/index.js',
          ),
        _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
          '../../../node_modules/@storybook/addon-docs/node_modules/@storybook/blocks/dist/index.mjs',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _StudioTableLocalPagination_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioTableLocalPagination/StudioTableLocalPagination.stories.tsx',
        );
      __webpack_require__(
        './src/components/StudioTableLocalPagination/StudioTableLocalPagination.tsx',
      );
      function _createMdxContent(props) {
        const _components = {
          code: 'code',
          p: 'p',
          pre: 'pre',
          ...(0,
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_4__.R)(),
          ...props.components,
        };
        return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(
          react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,
          {
            children: [
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__.W8,
                { of: _StudioTableLocalPagination_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioTableLocalPagination',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__.f,
                {
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children:
                      'The StudioTableLocalPagination component handles pagination internally, eliminating the need for\nmanual control. It seamlessly manages pagination logic for you.',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_5__.Hl,
                { of: _StudioTableLocalPagination_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.D,
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
                      "const columns = [\n  {\n    accessor: 'icon',\n    heading: '',\n  },\n  {\n    accessor: 'name',\n    heading: 'Name',\n    sortable: true,\n  },\n  {\n    accessor: 'creator',\n    heading: 'Created by',\n  },\n  {\n    accessor: 'lastChanged',\n    heading: 'Last changed',\n    sortable: true,\n    headerCellClass: classes.lastChangedColumnWidth,\n    bodyCellsClass: 'someOtherCustomClass',\n    valueFormatter: (date) => formatDateDDMMYYYY(date),\n  },\n];\n",
                  },
                ),
              }),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.D,
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
          _Users_andreastanderen_Development_DigDir_altinn_studio_node_modules_storybook_addon_docs_dist_shims_mdx_react_shim_mjs__WEBPACK_IMPORTED_MODULE_4__.R)(),
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
