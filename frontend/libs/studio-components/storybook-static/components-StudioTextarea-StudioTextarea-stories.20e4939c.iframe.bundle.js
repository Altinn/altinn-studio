'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [1573],
  {
    './src/components/StudioTextarea/StudioTextarea.stories.tsx': (
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
        _StudioTextarea__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTextarea/StudioTextarea.tsx',
        );
      const meta = {
          title: 'StudioTextarea',
          component: _StudioTextarea__WEBPACK_IMPORTED_MODULE_1__.L,
          argTypes: { size: { control: 'radio', options: ['small', 'medium', 'large'] } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioTextarea__WEBPACK_IMPORTED_MODULE_1__.L,
            args,
          );
      Preview.args = {
        label: 'My awesome label',
        placeholder: 'Type something here...',
        error: '',
        hideLabel: !1,
        size: 'medium',
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioTextarea {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
