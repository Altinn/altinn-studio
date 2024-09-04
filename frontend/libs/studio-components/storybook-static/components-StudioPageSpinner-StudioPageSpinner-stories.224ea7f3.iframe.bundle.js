'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [43],
  {
    './src/components/StudioPageSpinner/StudioPageSpinner.stories.tsx': (
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
        _StudioPageSpinner__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioPageSpinner/StudioPageSpinner.tsx',
        );
      const meta = {
          title: 'StudioPageSpinner',
          component: _StudioPageSpinner__WEBPACK_IMPORTED_MODULE_1__.Z,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioPageSpinner__WEBPACK_IMPORTED_MODULE_1__.Z,
            args,
          );
      Preview.args = { spinnerTitle: 'Loading user profile', showSpinnerTitle: !0 };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioPageSpinner {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
