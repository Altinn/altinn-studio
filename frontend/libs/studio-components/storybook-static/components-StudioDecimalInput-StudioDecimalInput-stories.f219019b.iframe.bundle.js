'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [8615],
  {
    './src/components/StudioDecimalInput/StudioDecimalInput.stories.tsx': (
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
        _StudioDecimalInput__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioDecimalInput/StudioDecimalInput.tsx',
        );
      const __WEBPACK_DEFAULT_EXPORT__ = {
          title: 'StudioDecimalInput',
          component: _StudioDecimalInput__WEBPACK_IMPORTED_MODULE_1__.M,
          argTypes: { value: { control: 'text' } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioDecimalInput__WEBPACK_IMPORTED_MODULE_1__.M,
            args,
          );
      Preview.args = {
        description: 'This is a decimal input',
        value: 2.3,
        label: 'Decimal input',
        validationErrorMessage: 'Your custom error message!',
      };
      const __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: 'args => <StudioDecimalInput {...args}></StudioDecimalInput>',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
