(() => {
  'use strict';
  var deferred,
    leafPrototypes,
    getProto,
    inProgress,
    __webpack_modules__ = {},
    __webpack_module_cache__ = {};
  function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = (__webpack_module_cache__[moduleId] = { id: moduleId, loaded: !1, exports: {} });
    return (
      __webpack_modules__[moduleId].call(
        module.exports,
        module,
        module.exports,
        __webpack_require__,
      ),
      (module.loaded = !0),
      module.exports
    );
  }
  (__webpack_require__.m = __webpack_modules__),
    (__webpack_require__.amdO = {}),
    (deferred = []),
    (__webpack_require__.O = (result, chunkIds, fn, priority) => {
      if (!chunkIds) {
        var notFulfilled = 1 / 0;
        for (i = 0; i < deferred.length; i++) {
          for (
            var [chunkIds, fn, priority] = deferred[i], fulfilled = !0, j = 0;
            j < chunkIds.length;
            j++
          )
            (!1 & priority || notFulfilled >= priority) &&
            Object.keys(__webpack_require__.O).every((key) =>
              __webpack_require__.O[key](chunkIds[j]),
            )
              ? chunkIds.splice(j--, 1)
              : ((fulfilled = !1), priority < notFulfilled && (notFulfilled = priority));
          if (fulfilled) {
            deferred.splice(i--, 1);
            var r = fn();
            void 0 !== r && (result = r);
          }
        }
        return result;
      }
      priority = priority || 0;
      for (var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--)
        deferred[i] = deferred[i - 1];
      deferred[i] = [chunkIds, fn, priority];
    }),
    (__webpack_require__.n = (module) => {
      var getter = module && module.__esModule ? () => module.default : () => module;
      return __webpack_require__.d(getter, { a: getter }), getter;
    }),
    (getProto = Object.getPrototypeOf
      ? (obj) => Object.getPrototypeOf(obj)
      : (obj) => obj.__proto__),
    (__webpack_require__.t = function (value, mode) {
      if ((1 & mode && (value = this(value)), 8 & mode)) return value;
      if ('object' == typeof value && value) {
        if (4 & mode && value.__esModule) return value;
        if (16 & mode && 'function' == typeof value.then) return value;
      }
      var ns = Object.create(null);
      __webpack_require__.r(ns);
      var def = {};
      leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
      for (
        var current = 2 & mode && value;
        'object' == typeof current && !~leafPrototypes.indexOf(current);
        current = getProto(current)
      )
        Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => value[key]));
      return (def.default = () => value), __webpack_require__.d(ns, def), ns;
    }),
    (__webpack_require__.d = (exports, definition) => {
      for (var key in definition)
        __webpack_require__.o(definition, key) &&
          !__webpack_require__.o(exports, key) &&
          Object.defineProperty(exports, key, { enumerable: !0, get: definition[key] });
    }),
    (__webpack_require__.f = {}),
    (__webpack_require__.e = (chunkId) =>
      Promise.all(
        Object.keys(__webpack_require__.f).reduce(
          (promises, key) => (__webpack_require__.f[key](chunkId, promises), promises),
          [],
        ),
      )),
    (__webpack_require__.u = (chunkId) =>
      (({
        43: 'components-StudioPageSpinner-StudioPageSpinner-stories',
        199: 'components-StudioNativeSelect-StudioNativeSelect-stories',
        275: 'components-StudioPopover-StudioPopover-stories',
        397: 'components-StudioBooleanToggleGroup-StudioBooleanToggleGroup-mdx',
        1219: 'components-StudioSpinner-StudioSpinner-stories',
        1349: 'components-StudioResizableLayout-StudioResizableLayout-mdx',
        1435: 'components-StudioRecommendedNextAction-StudioRecommendedNextAction-stories',
        1549: 'components-StudioLabelWrapper-StudioLabelWrapper-mdx',
        1573: 'components-StudioTextarea-StudioTextarea-stories',
        1629: 'components-StudioDecimalInput-StudioDecimalInput-mdx',
        1855: 'components-StudioResizableLayout-StudioResizableLayout-stories',
        2371: 'components-StudioCenter-StudioCenter-stories',
        2407: 'components-StudioToggleableTextfield-StudioToggleableTextfield-stories',
        3355: 'components-StudioToggleableTextfieldSchema-StudioToggleableTextfieldSchema-stories',
        3653: 'components-StudioModal-StudioModal-mdx',
        3663: 'components-StudioSectionHeader-StudioSectionHeader-stories',
        3751: 'components-StudioTextfield-StudioTextfield-stories',
        3881: 'components-StudioToggleableTextfieldSchema-StudioToggleableTextfieldSchema-mdx',
        3911: 'components-StudioGridSelector-StudioGridSelector-stories',
        4009: 'components-StudioDisplayTile-StudioDisplayTile-mdx',
        4045: 'components-StudioToggleableTextfield-StudioToggleableTextfield-mdx',
        4055: 'components-StudioBooleanToggleGroup-StudioBooleanToggleGroup-stories',
        4165: 'components-StudioSectionHeader-StudioSectionHeader-mdx',
        4337: 'components-StudioIconTextfield-StudioIconTextfield-mdx',
        4837: 'components-StudioCodeFragment-StudioCodeFragment-mdx',
        4935: 'components-StudioLabelWrapper-StudioLabelWrapper-stories',
        5211: 'components-StudioDisplayTile-StudioDisplayTile-stories',
        5273: 'components-StudioTableRemotePagination-StudioTableRemotePagination-mdx',
        5643: 'components-StudioTreeView-StudioTreeView-stories',
        5839: 'components-StudioModal-StudioModal-stories',
        6219: 'components-StudioIcons-StudioIcons-stories',
        6319: 'components-StudioLabelAsParagraph-StudioLabelAsParagraph-mdx',
        6527: 'components-StudioTableLocalPagination-StudioTableLocalPagination-stories',
        6685: 'components-StudioProperty-StudioProperties-mdx',
        6757: 'components-StudioDeleteButton-StudioDeleteButton-mdx',
        6995: 'components-StudioExpression-StudioExpression-mdx',
        6998: 'components-StudioNotFoundPage-StudioNotFound-mdx',
        7017: 'components-StudioRecommendedNextAction-StudioRecommendedNextAction-mdx',
        7039: 'components-StudioDeleteButton-StudioDeleteButton-stories',
        7101: 'components-StudioDropdownMenu-StudioDropdownMenu-stories',
        7291: 'components-StudioProperty-StudioProperty-stories',
        7533: 'components-StudioNotFoundPage-StudioNotFoundPage-stories',
        7539: 'components-StudioIconTextfield-StudioIconTextfield-stories',
        7893: 'components-StudioExpression-StudioExpression-stories',
        8031: 'components-StudioPageError-StudioPageError-stories',
        8555: 'components-StudioButton-StudioButton-mdx',
        8585: 'components-StudioLabelAsParagraph-StudioLabelAsParagraph-stories',
        8597: 'components-StudioPageError-StudioPageError-mdx',
        8615: 'components-StudioDecimalInput-StudioDecimalInput-stories',
        8745: 'components-StudioTreeView-StudioTreeView-mdx',
        8937: 'components-StudioFileUploader-StudioFileUploader-stories',
        8957: 'components-StudioGridSelector-StudioGridSelector-mdx',
        9115: 'components-StudioTableRemotePagination-StudioTableRemotePagination-stories',
        9293: 'components-StudioButton-StudioButton-stories',
        9349: 'components-StudioTableLocalPagination-StudioTableLocalPagination-mdx',
        9436: 'Overview-mdx',
        9591: 'components-StudioAnimateHeight-StudioAnimateHeight-stories',
        9599: 'components-StudioCodeFragment-StudioCodeFragment-stories',
        9629: 'components-StudioAnimateHeight-StudioAnimateHeight-mdx',
        9759: 'components-StudioFileUploader-StudioFileUploader-mdx',
      })[chunkId] || chunkId) +
      '.' +
      {
        43: '224ea7f3',
        199: '0da26c86',
        275: '8c31320d',
        397: 'e548c3b0',
        814: 'ebccf358',
        1219: '4a9d6e95',
        1292: '41591d04',
        1349: '34f15a68',
        1435: '184857b5',
        1549: '78ac4b82',
        1573: '20e4939c',
        1583: 'f75020ec',
        1629: '3c022e0a',
        1855: 'a3ac2a00',
        2199: '33778df2',
        2371: 'a5c2259b',
        2407: 'e5113fe0',
        3355: '3a53c7ff',
        3653: 'c72d68f9',
        3663: '52c7700f',
        3700: '7d6a4c10',
        3751: 'b66734fa',
        3881: '6f4a0179',
        3911: '01714649',
        4009: '37da7727',
        4045: 'bcf8a016',
        4055: 'db962626',
        4165: '11078804',
        4337: '94d5311d',
        4837: '6e33cdb2',
        4935: 'a1f01df2',
        5211: 'bb6c1cbf',
        5273: 'e942e48a',
        5321: '6855c60d',
        5636: 'a2fc3ced',
        5643: '10fd109a',
        5764: '9f3c9633',
        5839: '9a3b7f89',
        6013: 'f286f9eb',
        6077: 'ce70045d',
        6219: '7a57f3aa',
        6319: 'db898272',
        6527: '2f2a0701',
        6685: 'd41512fa',
        6757: 'e54e4180',
        6995: '44640e03',
        6998: '478d62b3',
        7017: '57c80789',
        7039: 'd4ac67f4',
        7101: 'e6a0add7',
        7291: 'fdac5f12',
        7533: '2bda00cf',
        7539: 'd2101bfc',
        7592: 'c04038fe',
        7893: 'd7a957d9',
        8031: '348918b8',
        8157: '99c40fec',
        8271: '9f5696d3',
        8396: '08eaed5b',
        8555: '21ca8c02',
        8585: 'e23e3034',
        8597: 'c4de6047',
        8615: 'f219019b',
        8745: '0d552fbf',
        8937: 'de244368',
        8957: '7746d2ec',
        9115: 'ade134c1',
        9159: '20c2c877',
        9293: 'f1a890d1',
        9349: 'f5e4e585',
        9436: 'e0a60d56',
        9591: 'cf93f2d8',
        9599: 'eecff10d',
        9629: 'f0ffe0e8',
        9759: 'aac35b40',
      }[chunkId] +
      '.iframe.bundle.js'),
    (__webpack_require__.g = (function () {
      if ('object' == typeof globalThis) return globalThis;
      try {
        return this || new Function('return this')();
      } catch (e) {
        if ('object' == typeof window) return window;
      }
    })()),
    (__webpack_require__.hmd = (module) => (
      (module = Object.create(module)).children || (module.children = []),
      Object.defineProperty(module, 'exports', {
        enumerable: !0,
        set: () => {
          throw new Error(
            'ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' +
              module.id,
          );
        },
      }),
      module
    )),
    (__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)),
    (inProgress = {}),
    (__webpack_require__.l = (url, done, key, chunkId) => {
      if (inProgress[url]) inProgress[url].push(done);
      else {
        var script, needAttach;
        if (void 0 !== key)
          for (
            var scripts = document.getElementsByTagName('script'), i = 0;
            i < scripts.length;
            i++
          ) {
            var s = scripts[i];
            if (
              s.getAttribute('src') == url ||
              s.getAttribute('data-webpack') == '@studio/components:' + key
            ) {
              script = s;
              break;
            }
          }
        script ||
          ((needAttach = !0),
          ((script = document.createElement('script')).charset = 'utf-8'),
          (script.timeout = 120),
          __webpack_require__.nc && script.setAttribute('nonce', __webpack_require__.nc),
          script.setAttribute('data-webpack', '@studio/components:' + key),
          (script.src = url)),
          (inProgress[url] = [done]);
        var onScriptComplete = (prev, event) => {
            (script.onerror = script.onload = null), clearTimeout(timeout);
            var doneFns = inProgress[url];
            if (
              (delete inProgress[url],
              script.parentNode && script.parentNode.removeChild(script),
              doneFns && doneFns.forEach((fn) => fn(event)),
              prev)
            )
              return prev(event);
          },
          timeout = setTimeout(
            onScriptComplete.bind(null, void 0, { type: 'timeout', target: script }),
            12e4,
          );
        (script.onerror = onScriptComplete.bind(null, script.onerror)),
          (script.onload = onScriptComplete.bind(null, script.onload)),
          needAttach && document.head.appendChild(script);
      }
    }),
    (__webpack_require__.r = (exports) => {
      'undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(exports, '__esModule', { value: !0 });
    }),
    (__webpack_require__.nmd = (module) => (
      (module.paths = []), module.children || (module.children = []), module
    )),
    (__webpack_require__.p = ''),
    (() => {
      __webpack_require__.b = document.baseURI || self.location.href;
      var installedChunks = { 5354: 0 };
      (__webpack_require__.f.j = (chunkId, promises) => {
        var installedChunkData = __webpack_require__.o(installedChunks, chunkId)
          ? installedChunks[chunkId]
          : void 0;
        if (0 !== installedChunkData)
          if (installedChunkData) promises.push(installedChunkData[2]);
          else if (5354 != chunkId) {
            var promise = new Promise(
              (resolve, reject) =>
                (installedChunkData = installedChunks[chunkId] = [resolve, reject]),
            );
            promises.push((installedChunkData[2] = promise));
            var url = __webpack_require__.p + __webpack_require__.u(chunkId),
              error = new Error();
            __webpack_require__.l(
              url,
              (event) => {
                if (
                  __webpack_require__.o(installedChunks, chunkId) &&
                  (0 !== (installedChunkData = installedChunks[chunkId]) &&
                    (installedChunks[chunkId] = void 0),
                  installedChunkData)
                ) {
                  var errorType = event && ('load' === event.type ? 'missing' : event.type),
                    realSrc = event && event.target && event.target.src;
                  (error.message =
                    'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')'),
                    (error.name = 'ChunkLoadError'),
                    (error.type = errorType),
                    (error.request = realSrc),
                    installedChunkData[1](error);
                }
              },
              'chunk-' + chunkId,
              chunkId,
            );
          } else installedChunks[chunkId] = 0;
      }),
        (__webpack_require__.O.j = (chunkId) => 0 === installedChunks[chunkId]);
      var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
          var moduleId,
            chunkId,
            [chunkIds, moreModules, runtime] = data,
            i = 0;
          if (chunkIds.some((id) => 0 !== installedChunks[id])) {
            for (moduleId in moreModules)
              __webpack_require__.o(moreModules, moduleId) &&
                (__webpack_require__.m[moduleId] = moreModules[moduleId]);
            if (runtime) var result = runtime(__webpack_require__);
          }
          for (
            parentChunkLoadingFunction && parentChunkLoadingFunction(data);
            i < chunkIds.length;
            i++
          )
            (chunkId = chunkIds[i]),
              __webpack_require__.o(installedChunks, chunkId) &&
                installedChunks[chunkId] &&
                installedChunks[chunkId][0](),
              (installedChunks[chunkId] = 0);
          return __webpack_require__.O(result);
        },
        chunkLoadingGlobal = (self.webpackChunk_studio_components =
          self.webpackChunk_studio_components || []);
      chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0)),
        (chunkLoadingGlobal.push = webpackJsonpCallback.bind(
          null,
          chunkLoadingGlobal.push.bind(chunkLoadingGlobal),
        ));
    })(),
    (__webpack_require__.nc = void 0);
})();
