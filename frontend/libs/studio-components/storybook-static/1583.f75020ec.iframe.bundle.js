'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [1583],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { $: () => Button });
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          ),
        _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const Button = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        (
          {
            children,
            color = 'first',
            variant = 'primary',
            fullWidth = !1,
            icon = !1,
            type = 'button',
            className,
            asChild,
            ...rest
          },
          ref,
        ) => {
          const size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(rest.size || 'md'),
            Component = asChild
              ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__.D
              : 'button';
          return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
            ref,
            type,
            className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
              'fds-btn',
              'fds-focus',
              `fds-btn--${size}`,
              `fds-btn--${variant}`,
              `fds-btn--${color}`,
              fullWidth && 'fds-btn--full-width',
              icon && 'fds-btn--icon-only',
              className,
            ),
            ...rest,
            children,
          });
        },
      );
      Button.displayName = 'Button';
    },
    './src/components/StudioSpinner/StudioSpinner.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { W: () => StudioSpinner });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        Spinner = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Spinner/Spinner.js',
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
        StudioSpinner_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSpinner/StudioSpinner.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioSpinner_module.A, options);
      const StudioSpinner_StudioSpinner_module =
          StudioSpinner_module.A && StudioSpinner_module.A.locals
            ? StudioSpinner_module.A.locals
            : void 0,
        StudioSpinner = (0, react.forwardRef)(
          (
            {
              spinnerTitle,
              showSpinnerTitle = !1,
              size = 'medium',
              variant = 'interaction',
              ...rest
            },
            ref,
          ) => {
            const spinnerDescriptionId = (0, react.useId)();
            return react.createElement(
              'div',
              { className: StudioSpinner_StudioSpinner_module.spinnerWrapper, ref, ...rest },
              react.createElement(Spinner.y, {
                title: !showSpinnerTitle && spinnerTitle,
                size,
                variant,
                'aria-describedby': showSpinnerTitle ? spinnerDescriptionId : null,
                'data-testid': 'studio-spinner-test-id',
              }),
              showSpinnerTitle &&
                react.createElement(Paragraph.f, { id: spinnerDescriptionId }, spinnerTitle),
            );
          },
        );
      (StudioSpinner.displayName = 'StudioSpinner'),
        (StudioSpinner.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioSpinner',
          props: {
            showSpinnerTitle: { defaultValue: { value: 'false', computed: !1 }, required: !1 },
            size: { defaultValue: { value: "'medium'", computed: !1 }, required: !1 },
            variant: { defaultValue: { value: "'interaction'", computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioSpinner/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        W: () => _StudioSpinner__WEBPACK_IMPORTED_MODULE_0__.W,
      });
      var _StudioSpinner__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioSpinner/StudioSpinner.tsx',
      );
    },
    './src/components/StudioTableRemotePagination/StudioTableRemotePagination.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { P: () => StudioTableRemotePagination });
      var _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Table/index.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Label/Label.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/form/NativeSelect/NativeSelect.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Pagination/index.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css',
        ),
        _StudioSpinner__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioSpinner/index.ts',
        ),
        _hooks__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__('./src/hooks/index.ts');
      const StudioTableRemotePagination = (0, react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(
        (
          {
            columns,
            rows,
            size = 'medium',
            isLoading = !1,
            loadingText,
            emptyTableFallback,
            onSortClick,
            pagination,
          },
          ref,
        ) => {
          const selectId = (0, react__WEBPACK_IMPORTED_MODULE_0__.useId)(),
            tableBodyRef = (0, react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null),
            [spinnerHeight, setSpinnerHeight] = react__WEBPACK_IMPORTED_MODULE_0__.useState('75px'),
            {
              currentPage,
              totalPages,
              totalRows,
              pageSize,
              pageSizeOptions,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
              paginationTexts,
            } = pagination || {},
            {
              pageSizeLabel,
              totalRowsText,
              nextButtonAriaLabel,
              previousButtonAriaLabel,
              numberButtonAriaLabel,
            } = paginationTexts || {},
            isTableEmpty = 0 === rows.length && !isLoading,
            isSortingActive = !isTableEmpty && onSortClick,
            isPaginationActive = pagination && totalRows > Math.min(...pageSizeOptions),
            retainedIsPaginationActive = (0, _hooks__WEBPACK_IMPORTED_MODULE_3__.oM)(
              isLoading,
              isPaginationActive,
            ),
            retainedTotalPages = (0, _hooks__WEBPACK_IMPORTED_MODULE_3__.oM)(isLoading, totalPages),
            retainedTotalRows = (0, _hooks__WEBPACK_IMPORTED_MODULE_3__.oM)(isLoading, totalRows);
          return (
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
              rows.length > 0 && setSpinnerHeight(tableBodyRef.current.clientHeight + 'px');
            }, [tableBodyRef, rows.length]),
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
              totalRows > 0 && isTableEmpty && handlePageChange(1);
            }, [totalRows, isTableEmpty, handlePageChange]),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              'div',
              {
                className:
                  _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                    .componentContainer,
              },
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI,
                {
                  size,
                  className:
                    _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A.table,
                  ref,
                },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Head,
                  null,
                  react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                    _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row,
                    null,
                    columns.map(({ accessor, heading, sortable, headerCellClass }) =>
                      react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.HeaderCell,
                        {
                          key: accessor,
                          sortable: isSortingActive && sortable,
                          onSortClick: () => onSortClick(accessor),
                          className: headerCellClass,
                        },
                        heading,
                      ),
                    ),
                  ),
                ),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Body,
                  { ref: tableBodyRef },
                  rows.map((row) =>
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Row,
                      { key: String(row.id) },
                      columns.map(({ accessor, bodyCellClass, bodyCellFormatter }) =>
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                          _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_4__.XI.Cell,
                          { key: accessor, className: bodyCellClass },
                          bodyCellFormatter ? bodyCellFormatter(row[accessor]) : row[accessor],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              isTableEmpty &&
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  'div',
                  {
                    className:
                      _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                        .emptyTableFallbackContainer,
                  },
                  emptyTableFallback,
                ),
              isLoading &&
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  _StudioSpinner__WEBPACK_IMPORTED_MODULE_2__.W,
                  { style: { height: spinnerHeight }, spinnerTitle: loadingText },
                ),
              retainedIsPaginationActive &&
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  'div',
                  {
                    className:
                      _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                        .paginationContainer,
                  },
                  react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                    'div',
                    {
                      className:
                        _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                          .selectContainer,
                    },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.J,
                      {
                        htmlFor: selectId,
                        size,
                        className:
                          _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                            .selectLabel,
                      },
                      pageSizeLabel,
                    ),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.m,
                      {
                        id: selectId,
                        size,
                        defaultValue: pageSize,
                        className:
                          _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                            .select,
                        onChange: (e) => handlePageSizeChange(Number(e.target.value)),
                      },
                      pageSizeOptions.map((pageSizeOption) =>
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                          'option',
                          { key: pageSizeOption, value: pageSizeOption },
                          pageSizeOption,
                        ),
                      ),
                    ),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_7__.f,
                      {
                        size,
                        className:
                          _StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_1__.A
                            .rowCounter,
                      },
                      totalRowsText,
                      ' ',
                      retainedTotalRows,
                    ),
                  ),
                  retainedTotalPages > 1 &&
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_8__.dK,
                      {
                        size,
                        currentPage,
                        totalPages: retainedTotalPages,
                        onChange: handlePageChange,
                        nextLabel: nextButtonAriaLabel,
                        previousLabel: previousButtonAriaLabel,
                        itemLabel: numberButtonAriaLabel,
                        hideLabels: !0,
                        compact: !0,
                      },
                    ),
                ),
            )
          );
        },
      );
      (StudioTableRemotePagination.displayName = 'StudioTableRemotePagination'),
        (StudioTableRemotePagination.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioTableRemotePagination',
          props: {
            size: { defaultValue: { value: "'medium'", computed: !1 }, required: !1 },
            isLoading: { defaultValue: { value: 'false', computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioTableRemotePagination/mockData.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { YB: () => columns, Ge: () => rows });
      var Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        ),
        esm = __webpack_require__(
          '../../../node_modules/@navikt/aksel-icons/dist/react/esm/index.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
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
        mockData_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTableRemotePagination/mockData.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(mockData_module.A, options);
      const IconButton = ({ icon }) =>
          react.createElement(Button.$, { variant: 'tertiary', icon: !0 }, icon),
        columns = [
          { accessor: 'icon', heading: '' },
          { accessor: 'name', heading: 'Name', sortable: !0 },
          { accessor: 'creator', heading: 'Created by' },
          {
            accessor: 'lastChanged',
            heading: 'Last changed',
            sortable: !0,
            headerCellClass: (mockData_module.A && mockData_module.A.locals
              ? mockData_module.A.locals
              : void 0
            ).lastChangedColumnWidth,
            bodyCellClass: 'someOtherCustomClass',
            bodyCellFormatter: (date) =>
              new Date(date).toLocaleDateString('nb', { dateStyle: 'short' }),
          },
        ],
        rows = [
          {
            id: 1,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Coordinated register notification',
            creator: 'Brønnøysund Register Centre',
            lastChanged: '2023-04-12',
          },
          {
            id: 2,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Application for authorisation and license as a healthcare personnel',
            creator: 'The Norwegian Directorate of Health',
            lastChanged: '2023-04-05',
          },
          {
            id: 3,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Produkter og tjenester fra Brønnøysundregistrene',
            creator: 'Brønnøysund Register Centre',
            lastChanged: '2023-04-16',
          },
          {
            id: 4,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.Gg5, null) }),
            name: 'Contact form - Norwegian Tax Administration (private individual)',
            creator: 'Tax Administration',
            lastChanged: '2023-04-08',
          },
          {
            id: 5,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Contact form - Norwegian Tax Administration (commercial)',
            creator: 'Tax Administration',
            lastChanged: '2023-04-01',
          },
          {
            id: 6,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'A-melding – all forms',
            creator: 'Brønnøysund Register Centre',
            lastChanged: '2023-04-14',
          },
          {
            id: 7,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.Gg5, null) }),
            name: 'Application for VAT registration',
            creator: 'Tax Administration',
            lastChanged: '2023-04-03',
          },
          {
            id: 8,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Reporting of occupational injuries and diseases',
            creator: 'Norwegian Labour Inspection Authority',
            lastChanged: '2023-04-11',
          },
          {
            id: 9,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Application for a residence permit',
            creator: 'Norwegian Directorate of Immigration',
            lastChanged: '2023-04-06',
          },
          {
            id: 10,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.Gg5, null) }),
            name: 'Application for a work permit',
            creator: 'Norwegian Directorate of Immigration',
            lastChanged: '2023-04-15',
          },
          {
            id: 11,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Notification of change of address',
            creator: 'Norwegian Tax Administration',
            lastChanged: '2023-04-09',
          },
          {
            id: 12,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Application for a Norwegian national ID number',
            creator: 'Norwegian Tax Administration',
            lastChanged: '2023-04-02',
          },
          {
            id: 13,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.Gg5, null) }),
            name: 'Reporting of temporary layoffs',
            creator: 'Norwegian Labour and Welfare Administration',
            lastChanged: '2023-04-07',
          },
          {
            id: 14,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Application for parental benefit',
            creator: 'Norwegian Labour and Welfare Administration',
            lastChanged: '2023-04-13',
          },
          {
            id: 15,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.BQJ, null) }),
            name: 'Reporting of VAT',
            creator: 'Tax Administration',
            lastChanged: '2023-04-04',
          },
          {
            id: 16,
            icon: react.createElement(IconButton, { icon: react.createElement(esm.Gg5, null) }),
            name: 'Application for a certificate of good conduct',
            creator: 'Norwegian Police',
            lastChanged: '2023-04-10',
          },
        ];
    },
    './src/components/StudioTableRemotePagination/utils.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { J: () => getRowsToRender });
      const getRowsToRender = (currentPage, pageSize, rows) => {
        if (!pageSize) return rows;
        const startIndex = (currentPage - 1) * pageSize,
          endIndex = startIndex + pageSize;
        return rows.slice(startIndex, endIndex);
      };
    },
    './src/hooks/index.ts': (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
      __webpack_require__.d(__webpack_exports__, {
        Ub: () => useMediaQuery,
        ZC: () => usePrevious,
        oM: () => useRetainWhileLoading,
      });
      var react = __webpack_require__('../../../node_modules/react/index.js');
      function useMediaQuery(query) {
        const getMatches = (query) => window?.matchMedia(query).matches ?? !1,
          [matches, setMatches] = (0, react.useState)(getMatches(query)),
          eventListener = () => {
            setMatches(getMatches(query));
          };
        return (
          (0, react.useEffect)(() => {
            const matchMedia = window.matchMedia(query);
            return (
              eventListener(),
              matchMedia.addEventListener('change', eventListener),
              () => matchMedia.removeEventListener('change', eventListener)
            );
          }, [query]),
          matches
        );
      }
      function usePrevious(value) {
        const ref = (0, react.useRef)();
        return (
          (0, react.useEffect)(() => {
            ref.current = value;
          }, [value]),
          ref.current
        );
      }
      const useRetainWhileLoading = (isLoading, value) => {
        const previousValue = usePrevious(value);
        return isLoading ? previousValue : value;
      };
      __webpack_require__('./src/hooks/useLocalStorage.ts'),
        __webpack_require__('./src/hooks/webStorage.ts');
    },
    './src/hooks/useLocalStorage.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { M: () => useLocalStorage });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _webStorage__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__('./src/hooks/webStorage.ts');
      const useLocalStorage = (key, initialValue) =>
        ((typedStorage, key, initialValue) => {
          const [value, setValue] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
            () => typedStorage.getItem(key) || initialValue,
          );
          return [
            value,
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(
              (newValue) => {
                typedStorage.setItem(key, newValue), setValue(newValue);
              },
              [key, typedStorage],
            ),
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
              typedStorage.removeItem(key), setValue(void 0);
            }, [key, typedStorage]),
          ];
        })(_webStorage__WEBPACK_IMPORTED_MODULE_1__.t, key, initialValue);
    },
    './src/hooks/useTableSorting.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { M: () => useTableSorting });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        '../../../node_modules/react/index.js',
      );
      const useTableSorting = (rows, options) => {
        const [sortColumn, setSortColumn] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(null),
          [sortDirection, setSortDirection] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
            'asc',
          ),
          [sortedRows, setSortedRows] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(rows);
        return (
          (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
            if (null !== sortColumn) {
              const newSortedRows = [...rows].sort((rowA, rowB) => {
                let cellA = rowA[sortColumn],
                  cellB = rowB[sortColumn];
                return (
                  'string' == typeof cellA &&
                    'string' == typeof cellB &&
                    ((cellA = cellA.toLowerCase()), (cellB = cellB.toLowerCase())),
                  cellA > cellB
                    ? 'asc' === sortDirection
                      ? 1
                      : -1
                    : cellA < cellB
                      ? 'asc' === sortDirection
                        ? -1
                        : 1
                      : 0
                );
              });
              setSortedRows(newSortedRows);
            } else setSortedRows(rows);
          }, [sortColumn, sortDirection, rows]),
          options.enable
            ? {
                sortedRows,
                handleSorting: (columnKey) => {
                  sortColumn === columnKey
                    ? setSortDirection((prevDirection) =>
                        'asc' === prevDirection ? 'desc' : 'asc',
                      )
                    : (setSortColumn(columnKey), setSortDirection('asc'));
                },
              }
            : { sortedRows: void 0, handleSorting: void 0 }
        );
      };
    },
    './src/hooks/webStorage.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { t: () => typedLocalStorage });
      const createWebStorage = (storage) => {
          storage ||
            console.warn(
              'Storage API not available. The browser might not support the provided storage.',
            );
          const removeItem = (key) => storage.removeItem(key);
          return {
            setItem: (key, value) => {
              void 0 !== value && storage.setItem(key, JSON.stringify(value));
            },
            getItem: (key) => {
              const storedItem = storage.getItem(key);
              if (storedItem)
                try {
                  return JSON.parse(storedItem);
                } catch (error) {
                  console.warn(
                    `Failed to parse stored item with key ${key}. Ensure that the item is a valid JSON string. Error: ${error}`,
                  ),
                    removeItem(key);
                }
            },
            removeItem,
          };
        },
        typedLocalStorage = createWebStorage(window?.localStorage);
      createWebStorage(window?.sessionStorage);
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioSpinner/StudioSpinner.module.css':
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
          '.ycOrwEJXAP5HPX_wEwId {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: var(--fds-spacing-1);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioSpinner/StudioSpinner.module.css'],
            names: [],
            mappings: 'AAAA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,yBAAyB;AAC3B',
            sourcesContent: [
              '.spinnerWrapper {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: var(--fds-spacing-1);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { spinnerWrapper: 'ycOrwEJXAP5HPX_wEwId' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css':
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
          '.UMazfac70jO1VlaMu_QI {\n  margin-bottom: var(--fds-spacing-10);\n}\n\n.fevY9w_5Z6Px34l72b4m {\n  width: 100%;\n}\n\n.mfUGlhfuEfoMcJUrlW01 {\n  padding: var(--fds-spacing-4);\n  text-align: center;\n}\n\n.mktGUnaD9mAq9cH_bb2a {\n  margin-top: var(--fds-spacing-4);\n  display: flex;\n  justify-content: space-between;\n}\n\n.E7dr99X_4v0fCQNqvEmg {\n  display: flex;\n  gap: var(--fds-spacing-3);\n}\n\n.QASkZLFuRDsxaatp5KsR {\n  margin-block: auto;\n}\n\n.l49vz9xwIUcdzhKZ8Pkz {\n  margin-block: auto;\n  font-weight: normal !important;\n}\n\n.mNNeEUube0UVmqgU8AuL {\n  margin-block: auto;\n  margin-left: var(--fds-spacing-6);\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,oCAAoC;AACtC;;AAEA;EACE,WAAW;AACb;;AAEA;EACE,6BAA6B;EAC7B,kBAAkB;AACpB;;AAEA;EACE,gCAAgC;EAChC,aAAa;EACb,8BAA8B;AAChC;;AAEA;EACE,aAAa;EACb,yBAAyB;AAC3B;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,kBAAkB;EAClB,8BAA8B;AAChC;;AAEA;EACE,kBAAkB;EAClB,iCAAiC;AACnC',
            sourcesContent: [
              '.componentContainer {\n  margin-bottom: var(--fds-spacing-10);\n}\n\n.table {\n  width: 100%;\n}\n\n.emptyTableFallbackContainer {\n  padding: var(--fds-spacing-4);\n  text-align: center;\n}\n\n.paginationContainer {\n  margin-top: var(--fds-spacing-4);\n  display: flex;\n  justify-content: space-between;\n}\n\n.selectContainer {\n  display: flex;\n  gap: var(--fds-spacing-3);\n}\n\n.select {\n  margin-block: auto;\n}\n\n.selectLabel {\n  margin-block: auto;\n  font-weight: normal !important;\n}\n\n.rowCounter {\n  margin-block: auto;\n  margin-left: var(--fds-spacing-6);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            componentContainer: 'UMazfac70jO1VlaMu_QI',
            table: 'fevY9w_5Z6Px34l72b4m',
            emptyTableFallbackContainer: 'mfUGlhfuEfoMcJUrlW01',
            paginationContainer: 'mktGUnaD9mAq9cH_bb2a',
            selectContainer: 'E7dr99X_4v0fCQNqvEmg',
            select: 'QASkZLFuRDsxaatp5KsR',
            selectLabel: 'l49vz9xwIUcdzhKZ8Pkz',
            rowCounter: 'mNNeEUube0UVmqgU8AuL',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTableRemotePagination/mockData.module.css':
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
          '.qEtS4AQTKRYZLdm_ipMi {\n  width: 20%;\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioTableRemotePagination/mockData.module.css'],
            names: [],
            mappings: 'AAAA;EACE,UAAU;AACZ',
            sourcesContent: ['.lastChangedColumnWidth {\n  width: 20%;\n}\n'],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { lastChangedColumnWidth: 'qEtS4AQTKRYZLdm_ipMi' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
      var _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleDomAPI.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertBySelector.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertStyleElement.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleTagTransform.js',
          ),
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default =
          __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__,
          ),
        _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_6_use_1_StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_6__ =
          __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTableRemotePagination/StudioTableRemotePagination.module.css',
          ),
        options = {};
      (options.styleTagTransform =
        _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default()),
        (options.setAttributes =
          _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default()),
        (options.insert =
          _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(
            null,
            'head',
          )),
        (options.domAPI =
          _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default()),
        (options.insertStyleElement =
          _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());
      _node_modules_storybook_builder_webpack5_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(
        _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_6_use_1_StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_6__.A,
        options,
      );
      const __WEBPACK_DEFAULT_EXPORT__ =
        _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_6_use_1_StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_6__.A &&
        _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_6_use_1_StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_6__
          .A.locals
          ? _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_cjs_js_ruleSet_1_rules_6_use_1_StudioTableRemotePagination_module_css__WEBPACK_IMPORTED_MODULE_6__
              .A.locals
          : void 0;
    },
  },
]);
