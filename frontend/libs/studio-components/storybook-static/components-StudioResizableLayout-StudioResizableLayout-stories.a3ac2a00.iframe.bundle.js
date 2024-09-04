'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [1855],
  {
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
    './src/components/StudioResizableLayout/StudioResizableLayout.stories.tsx': (
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
        _StudioResizableLayoutContainer_StudioResizableLayoutContainer__WEBPACK_IMPORTED_MODULE_1__ =
          __webpack_require__(
            './src/components/StudioResizableLayout/StudioResizableLayoutContainer/StudioResizableLayoutContainer.tsx',
          ),
        _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__ =
          __webpack_require__(
            './src/components/StudioResizableLayout/StudioResizableLayoutElement/StudioResizableLayoutElement.tsx',
          );
      const meta = {
          title: 'StudioResizableLayoutContainer',
          component:
            _StudioResizableLayoutContainer_StudioResizableLayoutContainer__WEBPACK_IMPORTED_MODULE_1__.HV,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            'div',
            null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioResizableLayoutContainer_StudioResizableLayoutContainer__WEBPACK_IMPORTED_MODULE_1__.HV,
              { orientation: args.topContainerOrientation, style: { width: 900, height: 800 } },
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__.A,
                { style: { backgroundColor: '#A1A1A1' } },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  'div',
                  null,
                  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                ),
              ),
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__.A,
                null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  _StudioResizableLayoutContainer_StudioResizableLayoutContainer__WEBPACK_IMPORTED_MODULE_1__.HV,
                  { orientation: args.subContainerOrientation },
                  react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                    _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__.A,
                    { style: { backgroundColor: '#C1C1C1' } },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      'div',
                      null,
                      'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                    ),
                  ),
                  react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                    _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__.A,
                    { style: { backgroundColor: '#D1D1D1' } },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                      'div',
                      null,
                      'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                    ),
                  ),
                ),
              ),
              react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                _StudioResizableLayoutElement_StudioResizableLayoutElement__WEBPACK_IMPORTED_MODULE_2__.A,
                { style: { backgroundColor: '#F1F1F1' } },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(
                  'div',
                  null,
                  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                ),
              ),
            ),
          );
      Preview.args = { topContainerOrientation: 'vertical', subContainerOrientation: 'horizontal' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource:
              "(args): React.ReactElement => <div>\n    <StudioResizableLayoutContainer orientation={args.topContainerOrientation} style={{\n    width: 900,\n    height: 800\n  }}>\n      <StudioResizableLayoutElement style={{\n      backgroundColor: '#A1A1A1'\n    }}>\n        <div>\n          lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut\n          labore et dolore magna aliqua\n        </div>\n      </StudioResizableLayoutElement>\n      <StudioResizableLayoutElement>\n        <StudioResizableLayoutContainer orientation={args.subContainerOrientation}>\n          <StudioResizableLayoutElement style={{\n          backgroundColor: '#C1C1C1'\n        }}>\n            <div>\n              lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor\n              incididunt ut labore et dolore magna aliqua\n            </div>\n          </StudioResizableLayoutElement>\n          <StudioResizableLayoutElement style={{\n          backgroundColor: '#D1D1D1'\n        }}>\n            <div>\n              lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor\n              incididunt ut labore et dolore magna aliqua\n            </div>\n          </StudioResizableLayoutElement>\n        </StudioResizableLayoutContainer>\n      </StudioResizableLayoutElement>\n      <StudioResizableLayoutElement style={{\n      backgroundColor: '#F1F1F1'\n    }}>\n        <div>\n          lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut\n          labore et dolore magna aliqua\n        </div>\n      </StudioResizableLayoutElement>\n    </StudioResizableLayoutContainer>\n  </div>",
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
