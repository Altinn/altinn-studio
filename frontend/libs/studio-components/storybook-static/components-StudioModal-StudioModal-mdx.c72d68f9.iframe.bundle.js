'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [3653, 5839],
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
    './src/components/StudioModal/StudioModal.mdx': (
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
        _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@storybook/addon-docs/node_modules/@storybook/blocks/dist/index.mjs',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Heading/Heading.js',
        ),
        _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        _StudioModal_stories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioModal/StudioModal.stories.tsx',
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
                { of: _StudioModal_stories__WEBPACK_IMPORTED_MODULE_2__ },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_5__.D,
                {
                  level: 1,
                  size: 'small',
                  children: (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_components.p, {
                    children: 'StudioModal',
                  }),
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _digdir_designsystemet_react__WEBPACK_IMPORTED_MODULE_6__.f,
                {
                  children:
                    'StudioModal is a modal component that is used to display content in a modal.',
                },
              ),
              '\n',
              (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(
                _storybook_blocks__WEBPACK_IMPORTED_MODULE_4__.Hl,
                { of: _StudioModal_stories__WEBPACK_IMPORTED_MODULE_2__.Preview },
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
    './src/components/StudioButton/StudioButton.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { r: () => StudioButton });
      var Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames),
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
        StudioButton_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioButton_module.A, options);
      const StudioButton_StudioButton_module =
          StudioButton_module.A && StudioButton_module.A.locals
            ? StudioButton_module.A.locals
            : void 0,
        StudioButton = (0, react.forwardRef)(
          (
            {
              icon,
              iconPlacement = 'left',
              size = 'small',
              children,
              className: givenClassName,
              color,
              ...rest
            },
            ref,
          ) => {
            const iconComponent = react.createElement(
                'span',
                { 'aria-hidden': !0, className: StudioButton_StudioButton_module.iconWrapper },
                icon,
              ),
              classNames = classnames_default()(
                givenClassName,
                StudioButton_StudioButton_module.studioButton,
                {
                  [StudioButton_StudioButton_module.inverted]: 'inverted' === color,
                  [StudioButton_StudioButton_module.small]: 'small' === size,
                },
              ),
              selectedColor = 'inverted' === color ? void 0 : color;
            return react.createElement(
              Button.$,
              { ...rest, color: selectedColor, className: classNames, icon: !children, size, ref },
              icon
                ? react.createElement(
                    'span',
                    { className: StudioButton_StudioButton_module.innerContainer },
                    'left' === iconPlacement && iconComponent,
                    children,
                    'right' === iconPlacement && iconComponent,
                  )
                : children,
            );
          },
        );
      (StudioButton.displayName = 'StudioButton'),
        (StudioButton.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioButton',
          props: {
            iconPlacement: { defaultValue: { value: "'left'", computed: !1 }, required: !1 },
            size: { defaultValue: { value: "'small'", computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioButton/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        r: () => _StudioButton__WEBPACK_IMPORTED_MODULE_0__.r,
      });
      var _StudioButton__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioButton/StudioButton.tsx',
      );
    },
    './src/components/StudioModal/StudioModal.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { O: () => StudioModal });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
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
        StudioModal_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioModal/StudioModal.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioModal_module.A, options);
      const StudioModal_StudioModal_module =
        StudioModal_module.A && StudioModal_module.A.locals ? StudioModal_module.A.locals : void 0;
      var lib = __webpack_require__('../../../node_modules/react-modal/lib/index.js'),
        lib_default = __webpack_require__.n(lib),
        src = __webpack_require__('../studio-icons/src/index.ts'),
        StudioButton = __webpack_require__('./src/components/StudioButton/index.ts');
      const StudioModal = (0, react.forwardRef)(
        ({ isOpen, onClose, title, children, closeButtonLabel, ...rest }, ref) =>
          react.createElement(
            lib_default(),
            {
              isOpen,
              onRequestClose: onClose,
              className: StudioModal_StudioModal_module.modal,
              overlayClassName: StudioModal_StudioModal_module.modalOverlay,
              ariaHideApp: !1,
              ref,
              ...rest,
            },
            react.createElement(
              'div',
              { className: StudioModal_StudioModal_module.headingWrapper },
              react.createElement(
                'div',
                { className: StudioModal_StudioModal_module.title },
                title,
              ),
              react.createElement(StudioButton.r, {
                variant: 'tertiary',
                icon: react.createElement(src.MultiplyIcon, null),
                onClick: onClose,
                'aria-label': closeButtonLabel,
              }),
            ),
            react.createElement(
              'div',
              { className: StudioModal_StudioModal_module.contentWrapper },
              children,
            ),
          ),
      );
      (StudioModal.displayName = 'StudioModal'),
        (StudioModal.__docgenInfo = {
          description:
            "@component\n   Component that displays a Modal for Altinn-studio\n\n@example\n   <StudioModal\n     isOpen={isOpen}\n     onClose={() => setIsOpen(false)}\n     title={\n       <div>\n         <SomeIcon />\n         <Heading level={1} size='small'>Some name</Heading>\n       </div>\n     }\n     closeButtonLabel='Close modal'\n   >\n     <div>\n       <SomeChildrenComponents />\n     </div>\n   </StudioModal>\n\n@property {boolean}[isOpen] - Flag for if the modal is open\n@property {function}[onClose] - Fucntion to execute when closing modal\n@property {ReactNode}[title] - Title of the modal\n@property {ReactNode}[children] - Content in the modal\n@property {string}[closeButtonLabel] - aria-label for close button\n\n@returns {ReactNode} - The rendered component",
          methods: [],
          displayName: 'StudioModal',
          props: {
            isOpen: { required: !0, tsType: { name: 'boolean' }, description: '' },
            onClose: {
              required: !0,
              tsType: {
                name: 'signature',
                type: 'function',
                raw: '() => void',
                signature: { arguments: [], return: { name: 'void' } },
              },
              description: '',
            },
            title: { required: !0, tsType: { name: 'ReactNode' }, description: '' },
            children: { required: !0, tsType: { name: 'ReactNode' }, description: '' },
            closeButtonLabel: { required: !0, tsType: { name: 'string' }, description: '' },
          },
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css':
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
          '.VsljBaht8yIHfQNncszf {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.pLTIwGuCRUzQbPzUljBE {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.nohkVRNOJdkmSdRVeuOQ {\n  display: contents;\n}\n\n.xfxnTjsHc_MM1EarWiUH {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.xfxnTjsHc_MM1EarWiUH:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.bJsmp0K5zJOZVdUgNX9V {\n  min-height: var(--fds-sizing-8);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioButton/StudioButton.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,oBAAoB;EACpB,yBAAyB;AAC3B;;AAEA;EACE,aAAa;EACb,mBAAmB;EACnB,yBAAyB;AAC3B;;AAEA;EACE,iBAAiB;AACnB;;AAEA;EACE,mDAAmD;EACnD,uBAAuB;AACzB;;AAEA;EACE,iEAAiE;AACnE;;AAEA;EACE,+BAA+B;AACjC',
            sourcesContent: [
              '.studioButton {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.innerContainer {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.iconWrapper {\n  display: contents;\n}\n\n.inverted {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.inverted:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.small {\n  min-height: var(--fds-sizing-8);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            studioButton: 'VsljBaht8yIHfQNncszf',
            innerContainer: 'pLTIwGuCRUzQbPzUljBE',
            iconWrapper: 'nohkVRNOJdkmSdRVeuOQ',
            inverted: 'xfxnTjsHc_MM1EarWiUH',
            small: 'bJsmp0K5zJOZVdUgNX9V',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioModal/StudioModal.module.css':
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
          '.ye4KdJFzsUmXANCXOtwC {\n  --modal-min-width: 320px;\n  --modal-min-height: 100px;\n  --modal-max-height: 80vh;\n  --modal-max-width: 80%;\n  --modal-position: 50%;\n  --modal-translate: calc(var(--modal-position) * -1);\n  --heading-height: 70px;\n  --modal-border-size: 1px;\n  --modal-border-radius: var(--fds-border_radius-medium);\n  --modal-content-max-height: calc(\n    var(--modal-max-height) - var(--heading-height) - var(--modal-border-size)\n  );\n  --modal-padding: var(--fds-spacing-3);\n\n  background-color: var(--fds-semantic-background-default);\n  border-radius: var(--modal-border-radius);\n  border: var(--modal-border-size) solid var(--fds-semantic-border-neutral-subtle);\n  height: max-content;\n  left: var(--modal-position);\n  max-height: var(--modal-max-height);\n  max-width: var(--modal-max-width);\n  min-height: var(--modal-min-height);\n  min-width: var(--modal-min-width);\n  position: absolute;\n  top: var(--modal-position);\n  transform: translate(var(--modal-translate), var(--modal-translate));\n  width: max-content;\n}\n\n.nFoI4hqTEEbyQ7ew8sZZ {\n  background-color: rgba(30, 43, 60, 0.5);\n  bottom: 0;\n  left: 0;\n  position: fixed;\n  right: 0;\n  top: 0;\n  z-index: 1000;\n}\n\n.NiKn3wSkGXdNrfMzR26g {\n  align-items: center;\n  background-color: var(--fds-semantic-background-default);\n  border-bottom: 1px solid var(--fds-semantic-border-divider-default);\n  box-sizing: border-box;\n  display: flex;\n  align-items: center;\n  height: var(--heading-height);\n  padding: var(--modal-padding);\n}\n\n.yJsbPMdOI3iS1YnLGQdb {\n  max-height: calc(var(--modal-content-max-height));\n  overflow-y: auto;\n}\n\n.nBb4D4Tgf2OHLx9Tphcg {\n  flex: 1;\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioModal/StudioModal.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,wBAAwB;EACxB,yBAAyB;EACzB,wBAAwB;EACxB,sBAAsB;EACtB,qBAAqB;EACrB,mDAAmD;EACnD,sBAAsB;EACtB,wBAAwB;EACxB,sDAAsD;EACtD;;GAEC;EACD,qCAAqC;;EAErC,wDAAwD;EACxD,yCAAyC;EACzC,gFAAgF;EAChF,mBAAmB;EACnB,2BAA2B;EAC3B,mCAAmC;EACnC,iCAAiC;EACjC,mCAAmC;EACnC,iCAAiC;EACjC,kBAAkB;EAClB,0BAA0B;EAC1B,oEAAoE;EACpE,kBAAkB;AACpB;;AAEA;EACE,uCAAuC;EACvC,SAAS;EACT,OAAO;EACP,eAAe;EACf,QAAQ;EACR,MAAM;EACN,aAAa;AACf;;AAEA;EACE,mBAAmB;EACnB,wDAAwD;EACxD,mEAAmE;EACnE,sBAAsB;EACtB,aAAa;EACb,mBAAmB;EACnB,6BAA6B;EAC7B,6BAA6B;AAC/B;;AAEA;EACE,iDAAiD;EACjD,gBAAgB;AAClB;;AAEA;EACE,OAAO;AACT',
            sourcesContent: [
              '.modal {\n  --modal-min-width: 320px;\n  --modal-min-height: 100px;\n  --modal-max-height: 80vh;\n  --modal-max-width: 80%;\n  --modal-position: 50%;\n  --modal-translate: calc(var(--modal-position) * -1);\n  --heading-height: 70px;\n  --modal-border-size: 1px;\n  --modal-border-radius: var(--fds-border_radius-medium);\n  --modal-content-max-height: calc(\n    var(--modal-max-height) - var(--heading-height) - var(--modal-border-size)\n  );\n  --modal-padding: var(--fds-spacing-3);\n\n  background-color: var(--fds-semantic-background-default);\n  border-radius: var(--modal-border-radius);\n  border: var(--modal-border-size) solid var(--fds-semantic-border-neutral-subtle);\n  height: max-content;\n  left: var(--modal-position);\n  max-height: var(--modal-max-height);\n  max-width: var(--modal-max-width);\n  min-height: var(--modal-min-height);\n  min-width: var(--modal-min-width);\n  position: absolute;\n  top: var(--modal-position);\n  transform: translate(var(--modal-translate), var(--modal-translate));\n  width: max-content;\n}\n\n.modalOverlay {\n  background-color: rgba(30, 43, 60, 0.5);\n  bottom: 0;\n  left: 0;\n  position: fixed;\n  right: 0;\n  top: 0;\n  z-index: 1000;\n}\n\n.headingWrapper {\n  align-items: center;\n  background-color: var(--fds-semantic-background-default);\n  border-bottom: 1px solid var(--fds-semantic-border-divider-default);\n  box-sizing: border-box;\n  display: flex;\n  align-items: center;\n  height: var(--heading-height);\n  padding: var(--modal-padding);\n}\n\n.contentWrapper {\n  max-height: calc(var(--modal-content-max-height));\n  overflow-y: auto;\n}\n\n.title {\n  flex: 1;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            modal: 'ye4KdJFzsUmXANCXOtwC',
            modalOverlay: 'nFoI4hqTEEbyQ7ew8sZZ',
            headingWrapper: 'NiKn3wSkGXdNrfMzR26g',
            contentWrapper: 'yJsbPMdOI3iS1YnLGQdb',
            title: 'nBb4D4Tgf2OHLx9Tphcg',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioModal/StudioModal.stories.tsx': (
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
        _StudioModal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioModal/StudioModal.tsx',
        ),
        _StudioButton__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioButton/index.ts',
        );
      const meta = { title: 'StudioModal', component: _StudioModal__WEBPACK_IMPORTED_MODULE_1__.O },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(PreviewComponent, args, args.children),
        PreviewComponent = (args) => {
          const [isOpen, setIsOpen] = react__WEBPACK_IMPORTED_MODULE_0__.useState(args.isOpen);
          return react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            'div',
            null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioButton__WEBPACK_IMPORTED_MODULE_2__.r,
              { onClick: () => setIsOpen(!0) },
              'Open modal',
            ),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioModal__WEBPACK_IMPORTED_MODULE_1__.O,
              { ...args, isOpen, onClose: () => setIsOpen(!1) },
              args.children,
            ),
          );
        };
      Preview.args = {
        children:
          'Modal content is a ReactNode! Pass a component or a string like in this example.',
        isOpen: !1,
        title: 'My modal title',
        closeButtonLabel: 'Close demo modal',
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              '(args): React.ReactElement => <PreviewComponent {...args}>{args.children}</PreviewComponent>',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
