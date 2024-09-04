'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6219],
  {
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioIcons/StudioIconViewer.module.css':
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
          '.Th_uGXSdKaQDmpOWpbx2 {\n  height: 100vh;\n  max-width: 1200px;\n  width: 100%;\n}\n\n.JpZS9UjotD9YopmgDiRF {\n  margin-bottom: var(--fds-spacing-8);\n}\n\n.ozIWTWh4s8kcHY39E4_y {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: var(--fds-spacing-3);\n  width: 100%;\n}\n\n.DnHP1JtjO78KjW8umiJA {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  padding: var(--fds-spacing-3);\n  background: var(--fds-semantic-surface-first-light);\n}\n\n.hCcoje8YXjNje04qTEng {\n  font-size: 40px;\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioIcons/StudioIconViewer.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,aAAa;EACb,iBAAiB;EACjB,WAAW;AACb;;AAEA;EACE,mCAAmC;AACrC;;AAEA;EACE,aAAa;EACb,2DAA2D;EAC3D,yBAAyB;EACzB,WAAW;AACb;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,mBAAmB;EACnB,uBAAuB;EACvB,6BAA6B;EAC7B,mDAAmD;AACrD;;AAEA;EACE,eAAe;AACjB',
            sourcesContent: [
              '.rootContainer {\n  height: 100vh;\n  max-width: 1200px;\n  width: 100%;\n}\n\n.searchField {\n  margin-bottom: var(--fds-spacing-8);\n}\n\n.iconListContainer {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: var(--fds-spacing-3);\n  width: 100%;\n}\n\n.iconCard {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  padding: var(--fds-spacing-3);\n  background: var(--fds-semantic-surface-first-light);\n}\n\n.icon {\n  font-size: 40px;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            rootContainer: 'Th_uGXSdKaQDmpOWpbx2',
            searchField: 'JpZS9UjotD9YopmgDiRF',
            iconListContainer: 'ozIWTWh4s8kcHY39E4_y',
            iconCard: 'DnHP1JtjO78KjW8umiJA',
            icon: 'hCcoje8YXjNje04qTEng',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioIcons/StudioIcons.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => StudioIcons_stories,
        });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        StudioTextfield = __webpack_require__('./src/components/StudioTextfield/index.ts'),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
        src = __webpack_require__('../studio-icons/src/index.ts'),
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
        StudioIconViewer_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioIcons/StudioIconViewer.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioIconViewer_module.A, options);
      const StudioIcons_StudioIconViewer_module =
          StudioIconViewer_module.A && StudioIconViewer_module.A.locals
            ? StudioIconViewer_module.A.locals
            : void 0,
        icons = Object.keys(src),
        StudioIconViewer = () => {
          const [search, setSearch] = react.useState(''),
            searchedIcons = icons.filter((iconName) =>
              iconName.toLowerCase().includes(search.toLowerCase()),
            );
          return react.createElement(
            'div',
            { className: StudioIcons_StudioIconViewer_module.rootContainer },
            react.createElement(StudioTextfield.e, {
              label: 'Icon search',
              className: StudioIcons_StudioIconViewer_module.searchField,
              onChange: (e) => setSearch(e.target.value),
            }),
            react.createElement(
              'div',
              { className: StudioIcons_StudioIconViewer_module.iconListContainer },
              searchedIcons.map((iconName) => {
                const IconComponent = src[iconName];
                return react.createElement(
                  'div',
                  { key: iconName, className: StudioIcons_StudioIconViewer_module.iconCard },
                  react.createElement(IconComponent, {
                    className: StudioIcons_StudioIconViewer_module.icon,
                  }),
                  react.createElement(Paragraph.f, null, iconName),
                );
              }),
            ),
          );
        };
      StudioIconViewer.__docgenInfo = {
        description: '',
        methods: [],
        displayName: 'StudioIconViewer',
      };
      const Preview = () => react.createElement(StudioIconViewer, null),
        StudioIcons_stories = {
          title: 'Icons/StudioIcons',
          component: StudioIconViewer,
          parameters: { layout: 'fullscreen-centered' },
        },
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(): React.ReactElement => <StudioIconViewer />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
