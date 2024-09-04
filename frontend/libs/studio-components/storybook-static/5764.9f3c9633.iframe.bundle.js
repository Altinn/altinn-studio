'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [5764],
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
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/core/dist/floating-ui.core.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, {
          BN: () => shift,
          Ej: () => size,
          UE: () => arrow,
          UU: () => flip,
          cY: () => offset,
          rD: () => computePosition,
        });
        var _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.js',
        );
        function computeCoordsFromPlacement(_ref, placement, rtl) {
          let { reference, floating } = _ref;
          const sideAxis = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.TV)(
              placement,
            ),
            alignmentAxis = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Dz)(
              placement,
            ),
            alignLength = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.sq)(
              alignmentAxis,
            ),
            side = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(placement),
            isVertical = 'y' === sideAxis,
            commonX = reference.x + reference.width / 2 - floating.width / 2,
            commonY = reference.y + reference.height / 2 - floating.height / 2,
            commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
          let coords;
          switch (side) {
            case 'top':
              coords = { x: commonX, y: reference.y - floating.height };
              break;
            case 'bottom':
              coords = { x: commonX, y: reference.y + reference.height };
              break;
            case 'right':
              coords = { x: reference.x + reference.width, y: commonY };
              break;
            case 'left':
              coords = { x: reference.x - floating.width, y: commonY };
              break;
            default:
              coords = { x: reference.x, y: reference.y };
          }
          switch (
            (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Sg)(placement)
          ) {
            case 'start':
              coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
              break;
            case 'end':
              coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
          }
          return coords;
        }
        const computePosition = async (reference, floating, config) => {
          const { placement = 'bottom', strategy = 'absolute', middleware = [], platform } = config,
            validMiddleware = middleware.filter(Boolean),
            rtl = await (null == platform.isRTL ? void 0 : platform.isRTL(floating));
          let rects = await platform.getElementRects({ reference, floating, strategy }),
            { x, y } = computeCoordsFromPlacement(rects, placement, rtl),
            statefulPlacement = placement,
            middlewareData = {},
            resetCount = 0;
          for (let i = 0; i < validMiddleware.length; i++) {
            const { name, fn } = validMiddleware[i],
              {
                x: nextX,
                y: nextY,
                data,
                reset,
              } = await fn({
                x,
                y,
                initialPlacement: placement,
                placement: statefulPlacement,
                strategy,
                middlewareData,
                rects,
                platform,
                elements: { reference, floating },
              });
            (x = null != nextX ? nextX : x),
              (y = null != nextY ? nextY : y),
              (middlewareData = {
                ...middlewareData,
                [name]: { ...middlewareData[name], ...data },
              }),
              reset &&
                resetCount <= 50 &&
                (resetCount++,
                'object' == typeof reset &&
                  (reset.placement && (statefulPlacement = reset.placement),
                  reset.rects &&
                    (rects =
                      !0 === reset.rects
                        ? await platform.getElementRects({ reference, floating, strategy })
                        : reset.rects),
                  ({ x, y } = computeCoordsFromPlacement(rects, statefulPlacement, rtl))),
                (i = -1));
          }
          return { x, y, placement: statefulPlacement, strategy, middlewareData };
        };
        async function detectOverflow(state, options) {
          var _await$platform$isEle;
          void 0 === options && (options = {});
          const { x, y, platform, rects, elements, strategy } = state,
            {
              boundary = 'clippingAncestors',
              rootBoundary = 'viewport',
              elementContext = 'floating',
              altBoundary = !1,
              padding = 0,
            } = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
              options,
              state,
            ),
            paddingObject = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.nI)(
              padding,
            ),
            element =
              elements[
                altBoundary
                  ? 'floating' === elementContext
                    ? 'reference'
                    : 'floating'
                  : elementContext
              ],
            clippingClientRect = (0,
            _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.B1)(
              await platform.getClippingRect({
                element:
                  null ==
                    (_await$platform$isEle = await (null == platform.isElement
                      ? void 0
                      : platform.isElement(element))) || _await$platform$isEle
                    ? element
                    : element.contextElement ||
                      (await (null == platform.getDocumentElement
                        ? void 0
                        : platform.getDocumentElement(elements.floating))),
                boundary,
                rootBoundary,
                strategy,
              }),
            ),
            rect = 'floating' === elementContext ? { ...rects.floating, x, y } : rects.reference,
            offsetParent = await (null == platform.getOffsetParent
              ? void 0
              : platform.getOffsetParent(elements.floating)),
            offsetScale = ((await (null == platform.isElement
              ? void 0
              : platform.isElement(offsetParent))) &&
              (await (null == platform.getScale ? void 0 : platform.getScale(offsetParent)))) || {
              x: 1,
              y: 1,
            },
            elementClientRect = (0,
            _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.B1)(
              platform.convertOffsetParentRelativeRectToViewportRelativeRect
                ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
                    elements,
                    rect,
                    offsetParent,
                    strategy,
                  })
                : rect,
            );
          return {
            top:
              (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
            bottom:
              (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) /
              offsetScale.y,
            left:
              (clippingClientRect.left - elementClientRect.left + paddingObject.left) /
              offsetScale.x,
            right:
              (elementClientRect.right - clippingClientRect.right + paddingObject.right) /
              offsetScale.x,
          };
        }
        const arrow = (options) => ({
            name: 'arrow',
            options,
            async fn(state) {
              const { x, y, placement, rects, platform, elements, middlewareData } = state,
                { element, padding = 0 } =
                  (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
                    options,
                    state,
                  ) || {};
              if (null == element) return {};
              const paddingObject = (0,
                _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.nI)(padding),
                coords = { x, y },
                axis = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Dz)(
                  placement,
                ),
                length = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.sq)(
                  axis,
                ),
                arrowDimensions = await platform.getDimensions(element),
                isYAxis = 'y' === axis,
                minProp = isYAxis ? 'top' : 'left',
                maxProp = isYAxis ? 'bottom' : 'right',
                clientProp = isYAxis ? 'clientHeight' : 'clientWidth',
                endDiff =
                  rects.reference[length] +
                  rects.reference[axis] -
                  coords[axis] -
                  rects.floating[length],
                startDiff = coords[axis] - rects.reference[axis],
                arrowOffsetParent = await (null == platform.getOffsetParent
                  ? void 0
                  : platform.getOffsetParent(element));
              let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
              (clientSize &&
                (await (null == platform.isElement
                  ? void 0
                  : platform.isElement(arrowOffsetParent)))) ||
                (clientSize = elements.floating[clientProp] || rects.floating[length]);
              const centerToReference = endDiff / 2 - startDiff / 2,
                largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1,
                minPadding = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.jk)(
                  paddingObject[minProp],
                  largestPossiblePadding,
                ),
                maxPadding = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.jk)(
                  paddingObject[maxProp],
                  largestPossiblePadding,
                ),
                min$1 = minPadding,
                max = clientSize - arrowDimensions[length] - maxPadding,
                center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference,
                offset = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.qE)(
                  min$1,
                  center,
                  max,
                ),
                shouldAddOffset =
                  !middlewareData.arrow &&
                  null !=
                    (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Sg)(
                      placement,
                    ) &&
                  center !== offset &&
                  rects.reference[length] / 2 -
                    (center < min$1 ? minPadding : maxPadding) -
                    arrowDimensions[length] / 2 <
                    0,
                alignmentOffset = shouldAddOffset
                  ? center < min$1
                    ? center - min$1
                    : center - max
                  : 0;
              return {
                [axis]: coords[axis] + alignmentOffset,
                data: {
                  [axis]: offset,
                  centerOffset: center - offset - alignmentOffset,
                  ...(shouldAddOffset && { alignmentOffset }),
                },
                reset: shouldAddOffset,
              };
            },
          }),
          flip = function (options) {
            return (
              void 0 === options && (options = {}),
              {
                name: 'flip',
                options,
                async fn(state) {
                  var _middlewareData$arrow, _middlewareData$flip;
                  const { placement, middlewareData, rects, initialPlacement, platform, elements } =
                      state,
                    {
                      mainAxis: checkMainAxis = !0,
                      crossAxis: checkCrossAxis = !0,
                      fallbackPlacements: specifiedFallbackPlacements,
                      fallbackStrategy = 'bestFit',
                      fallbackAxisSideDirection = 'none',
                      flipAlignment = !0,
                      ...detectOverflowOptions
                    } = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
                      options,
                      state,
                    );
                  if (
                    null != (_middlewareData$arrow = middlewareData.arrow) &&
                    _middlewareData$arrow.alignmentOffset
                  )
                    return {};
                  const side = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(placement),
                    isBasePlacement =
                      (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(
                        initialPlacement,
                      ) === initialPlacement,
                    rtl = await (null == platform.isRTL
                      ? void 0
                      : platform.isRTL(elements.floating)),
                    fallbackPlacements =
                      specifiedFallbackPlacements ||
                      (isBasePlacement || !flipAlignment
                        ? [
                            (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.bV)(
                              initialPlacement,
                            ),
                          ]
                        : (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.WJ)(
                            initialPlacement,
                          ));
                  specifiedFallbackPlacements ||
                    'none' === fallbackAxisSideDirection ||
                    fallbackPlacements.push(
                      ...(0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.lP)(
                        initialPlacement,
                        flipAlignment,
                        fallbackAxisSideDirection,
                        rtl,
                      ),
                    );
                  const placements = [initialPlacement, ...fallbackPlacements],
                    overflow = await detectOverflow(state, detectOverflowOptions),
                    overflows = [];
                  let overflowsData =
                    (null == (_middlewareData$flip = middlewareData.flip)
                      ? void 0
                      : _middlewareData$flip.overflows) || [];
                  if ((checkMainAxis && overflows.push(overflow[side]), checkCrossAxis)) {
                    const sides = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.w7)(
                      placement,
                      rects,
                      rtl,
                    );
                    overflows.push(overflow[sides[0]], overflow[sides[1]]);
                  }
                  if (
                    ((overflowsData = [...overflowsData, { placement, overflows }]),
                    !overflows.every((side) => side <= 0))
                  ) {
                    var _middlewareData$flip2, _overflowsData$filter;
                    const nextIndex =
                        ((null == (_middlewareData$flip2 = middlewareData.flip)
                          ? void 0
                          : _middlewareData$flip2.index) || 0) + 1,
                      nextPlacement = placements[nextIndex];
                    if (nextPlacement)
                      return {
                        data: { index: nextIndex, overflows: overflowsData },
                        reset: { placement: nextPlacement },
                      };
                    let resetPlacement =
                      null ==
                      (_overflowsData$filter = overflowsData
                        .filter((d) => d.overflows[0] <= 0)
                        .sort((a, b) => a.overflows[1] - b.overflows[1])[0])
                        ? void 0
                        : _overflowsData$filter.placement;
                    if (!resetPlacement)
                      switch (fallbackStrategy) {
                        case 'bestFit': {
                          var _overflowsData$map$so;
                          const placement =
                            null ==
                            (_overflowsData$map$so = overflowsData
                              .map((d) => [
                                d.placement,
                                d.overflows
                                  .filter((overflow) => overflow > 0)
                                  .reduce((acc, overflow) => acc + overflow, 0),
                              ])
                              .sort((a, b) => a[1] - b[1])[0])
                              ? void 0
                              : _overflowsData$map$so[0];
                          placement && (resetPlacement = placement);
                          break;
                        }
                        case 'initialPlacement':
                          resetPlacement = initialPlacement;
                      }
                    if (placement !== resetPlacement)
                      return { reset: { placement: resetPlacement } };
                  }
                  return {};
                },
              }
            );
          };
        const offset = function (options) {
            return (
              void 0 === options && (options = 0),
              {
                name: 'offset',
                options,
                async fn(state) {
                  var _middlewareData$offse, _middlewareData$arrow;
                  const { x, y, placement, middlewareData } = state,
                    diffCoords = await (async function convertValueToCoords(state, options) {
                      const { placement, platform, elements } = state,
                        rtl = await (null == platform.isRTL
                          ? void 0
                          : platform.isRTL(elements.floating)),
                        side = (0,
                        _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(
                          placement,
                        ),
                        alignment = (0,
                        _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Sg)(
                          placement,
                        ),
                        isVertical =
                          'y' ===
                          (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.TV)(
                            placement,
                          ),
                        mainAxisMulti = ['left', 'top'].includes(side) ? -1 : 1,
                        crossAxisMulti = rtl && isVertical ? -1 : 1,
                        rawValue = (0,
                        _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
                          options,
                          state,
                        );
                      let { mainAxis, crossAxis, alignmentAxis } =
                        'number' == typeof rawValue
                          ? { mainAxis: rawValue, crossAxis: 0, alignmentAxis: null }
                          : { mainAxis: 0, crossAxis: 0, alignmentAxis: null, ...rawValue };
                      return (
                        alignment &&
                          'number' == typeof alignmentAxis &&
                          (crossAxis = 'end' === alignment ? -1 * alignmentAxis : alignmentAxis),
                        isVertical
                          ? { x: crossAxis * crossAxisMulti, y: mainAxis * mainAxisMulti }
                          : { x: mainAxis * mainAxisMulti, y: crossAxis * crossAxisMulti }
                      );
                    })(state, options);
                  return placement ===
                    (null == (_middlewareData$offse = middlewareData.offset)
                      ? void 0
                      : _middlewareData$offse.placement) &&
                    null != (_middlewareData$arrow = middlewareData.arrow) &&
                    _middlewareData$arrow.alignmentOffset
                    ? {}
                    : {
                        x: x + diffCoords.x,
                        y: y + diffCoords.y,
                        data: { ...diffCoords, placement },
                      };
                },
              }
            );
          },
          shift = function (options) {
            return (
              void 0 === options && (options = {}),
              {
                name: 'shift',
                options,
                async fn(state) {
                  const { x, y, placement } = state,
                    {
                      mainAxis: checkMainAxis = !0,
                      crossAxis: checkCrossAxis = !1,
                      limiter = {
                        fn: (_ref) => {
                          let { x, y } = _ref;
                          return { x, y };
                        },
                      },
                      ...detectOverflowOptions
                    } = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
                      options,
                      state,
                    ),
                    coords = { x, y },
                    overflow = await detectOverflow(state, detectOverflowOptions),
                    crossAxis = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.TV)(
                      (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(
                        placement,
                      ),
                    ),
                    mainAxis = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.PG)(crossAxis);
                  let mainAxisCoord = coords[mainAxis],
                    crossAxisCoord = coords[crossAxis];
                  if (checkMainAxis) {
                    const maxSide = 'y' === mainAxis ? 'bottom' : 'right',
                      min = mainAxisCoord + overflow['y' === mainAxis ? 'top' : 'left'],
                      max = mainAxisCoord - overflow[maxSide];
                    mainAxisCoord = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.qE)(
                      min,
                      mainAxisCoord,
                      max,
                    );
                  }
                  if (checkCrossAxis) {
                    const maxSide = 'y' === crossAxis ? 'bottom' : 'right',
                      min = crossAxisCoord + overflow['y' === crossAxis ? 'top' : 'left'],
                      max = crossAxisCoord - overflow[maxSide];
                    crossAxisCoord = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.qE)(
                      min,
                      crossAxisCoord,
                      max,
                    );
                  }
                  const limitedCoords = limiter.fn({
                    ...state,
                    [mainAxis]: mainAxisCoord,
                    [crossAxis]: crossAxisCoord,
                  });
                  return {
                    ...limitedCoords,
                    data: { x: limitedCoords.x - x, y: limitedCoords.y - y },
                  };
                },
              }
            );
          },
          size = function (options) {
            return (
              void 0 === options && (options = {}),
              {
                name: 'size',
                options,
                async fn(state) {
                  const { placement, rects, platform, elements } = state,
                    { apply = () => {}, ...detectOverflowOptions } = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__._3)(
                      options,
                      state,
                    ),
                    overflow = await detectOverflow(state, detectOverflowOptions),
                    side = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.C0)(
                      placement,
                    ),
                    alignment = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.Sg)(placement),
                    isYAxis =
                      'y' ===
                      (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.TV)(
                        placement,
                      ),
                    { width, height } = rects.floating;
                  let heightSide, widthSide;
                  'top' === side || 'bottom' === side
                    ? ((heightSide = side),
                      (widthSide =
                        alignment ===
                        ((await (null == platform.isRTL
                          ? void 0
                          : platform.isRTL(elements.floating)))
                          ? 'start'
                          : 'end')
                          ? 'left'
                          : 'right'))
                    : ((widthSide = side), (heightSide = 'end' === alignment ? 'top' : 'bottom'));
                  const overflowAvailableHeight = height - overflow[heightSide],
                    overflowAvailableWidth = width - overflow[widthSide],
                    noShift = !state.middlewareData.shift;
                  let availableHeight = overflowAvailableHeight,
                    availableWidth = overflowAvailableWidth;
                  if (isYAxis) {
                    const maximumClippingWidth = width - overflow.left - overflow.right;
                    availableWidth =
                      alignment || noShift
                        ? (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.jk)(
                            overflowAvailableWidth,
                            maximumClippingWidth,
                          )
                        : maximumClippingWidth;
                  } else {
                    const maximumClippingHeight = height - overflow.top - overflow.bottom;
                    availableHeight =
                      alignment || noShift
                        ? (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.jk)(
                            overflowAvailableHeight,
                            maximumClippingHeight,
                          )
                        : maximumClippingHeight;
                  }
                  if (noShift && !alignment) {
                    const xMin = (0,
                      _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                        overflow.left,
                        0,
                      ),
                      xMax = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                        overflow.right,
                        0,
                      ),
                      yMin = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                        overflow.top,
                        0,
                      ),
                      yMax = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                        overflow.bottom,
                        0,
                      );
                    isYAxis
                      ? (availableWidth =
                          width -
                          2 *
                            (0 !== xMin || 0 !== xMax
                              ? xMin + xMax
                              : (0,
                                _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                                  overflow.left,
                                  overflow.right,
                                )))
                      : (availableHeight =
                          height -
                          2 *
                            (0 !== yMin || 0 !== yMax
                              ? yMin + yMax
                              : (0,
                                _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_0__.T9)(
                                  overflow.top,
                                  overflow.bottom,
                                )));
                  }
                  await apply({ ...state, availableWidth, availableHeight });
                  const nextDimensions = await platform.getDimensions(elements.floating);
                  return width !== nextDimensions.width || height !== nextDimensions.height
                    ? { reset: { rects: !0 } }
                    : {};
                },
              }
            );
          };
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/dom/dist/floating-ui.dom.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, {
          BN: () => shift,
          Ej: () => size,
          UE: () => arrow,
          UU: () => flip,
          ll: () => autoUpdate,
          rD: () => computePosition,
        });
        var _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/core/dist/floating-ui.core.js',
          ),
          _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.js',
          ),
          _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.js',
          );
        function getCssDimensions(element) {
          const css = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
            element,
          );
          let width = parseFloat(css.width) || 0,
            height = parseFloat(css.height) || 0;
          const hasOffset = (0,
            _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(element),
            offsetWidth = hasOffset ? element.offsetWidth : width,
            offsetHeight = hasOffset ? element.offsetHeight : height,
            shouldFallback =
              (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.LI)(width) !==
                offsetWidth ||
              (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.LI)(height) !==
                offsetHeight;
          return (
            shouldFallback && ((width = offsetWidth), (height = offsetHeight)),
            { width, height, $: shouldFallback }
          );
        }
        function unwrapElement(element) {
          return (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(element)
            ? element
            : element.contextElement;
        }
        function getScale(element) {
          const domElement = unwrapElement(element);
          if (
            !(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(domElement)
          )
            return (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(1);
          const rect = domElement.getBoundingClientRect(),
            { width, height, $ } = getCssDimensions(domElement);
          let x =
              ($
                ? (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.LI)(rect.width)
                : rect.width) / width,
            y =
              ($
                ? (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.LI)(rect.height)
                : rect.height) / height;
          return (
            (x && Number.isFinite(x)) || (x = 1), (y && Number.isFinite(y)) || (y = 1), { x, y }
          );
        }
        const noOffsets = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(0);
        function getVisualOffsets(element) {
          const win = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
            element,
          );
          return (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.Tc)() &&
            win.visualViewport
            ? { x: win.visualViewport.offsetLeft, y: win.visualViewport.offsetTop }
            : noOffsets;
        }
        function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
          void 0 === includeScale && (includeScale = !1),
            void 0 === isFixedStrategy && (isFixedStrategy = !1);
          const clientRect = element.getBoundingClientRect(),
            domElement = unwrapElement(element);
          let scale = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(1);
          includeScale &&
            (offsetParent
              ? (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
                  offsetParent,
                ) && (scale = getScale(offsetParent))
              : (scale = getScale(element)));
          const visualOffsets = (function shouldAddVisualOffsets(
            element,
            isFixed,
            floatingOffsetParent,
          ) {
            return (
              void 0 === isFixed && (isFixed = !1),
              !(
                !floatingOffsetParent ||
                (isFixed &&
                  floatingOffsetParent !==
                    (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
                      element,
                    ))
              ) && isFixed
            );
          })(domElement, isFixedStrategy, offsetParent)
            ? getVisualOffsets(domElement)
            : (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(0);
          let x = (clientRect.left + visualOffsets.x) / scale.x,
            y = (clientRect.top + visualOffsets.y) / scale.y,
            width = clientRect.width / scale.x,
            height = clientRect.height / scale.y;
          if (domElement) {
            const win = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
                domElement,
              ),
              offsetWin =
                offsetParent &&
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
                  offsetParent,
                )
                  ? (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
                      offsetParent,
                    )
                  : offsetParent;
            let currentWin = win,
              currentIFrame = currentWin.frameElement;
            for (; currentIFrame && offsetParent && offsetWin !== currentWin; ) {
              const iframeScale = getScale(currentIFrame),
                iframeRect = currentIFrame.getBoundingClientRect(),
                css = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
                  currentIFrame,
                ),
                left =
                  iframeRect.left +
                  (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x,
                top =
                  iframeRect.top +
                  (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
              (x *= iframeScale.x),
                (y *= iframeScale.y),
                (width *= iframeScale.x),
                (height *= iframeScale.y),
                (x += left),
                (y += top),
                (currentWin = (0,
                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
                  currentIFrame,
                )),
                (currentIFrame = currentWin.frameElement);
            }
          }
          return (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.B1)({
            width,
            height,
            x,
            y,
          });
        }
        const topLayerSelectors = [':popover-open', ':modal'];
        function isTopLayer(floating) {
          return topLayerSelectors.some((selector) => {
            try {
              return floating.matches(selector);
            } catch (e) {
              return !1;
            }
          });
        }
        function getWindowScrollBarX(element) {
          return (
            getBoundingClientRect(
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(element),
            ).left +
            (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.CP)(element)
              .scrollLeft
          );
        }
        function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
          let rect;
          if ('viewport' === clippingAncestor)
            rect = (function getViewportRect(element, strategy) {
              const win = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
                  element,
                ),
                html = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(
                  element,
                ),
                visualViewport = win.visualViewport;
              let width = html.clientWidth,
                height = html.clientHeight,
                x = 0,
                y = 0;
              if (visualViewport) {
                (width = visualViewport.width), (height = visualViewport.height);
                const visualViewportBased = (0,
                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.Tc)();
                (!visualViewportBased || (visualViewportBased && 'fixed' === strategy)) &&
                  ((x = visualViewport.offsetLeft), (y = visualViewport.offsetTop));
              }
              return { width, height, x, y };
            })(element, strategy);
          else if ('document' === clippingAncestor)
            rect = (function getDocumentRect(element) {
              const html = (0,
                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(element),
                scroll = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.CP)(
                  element,
                ),
                body = element.ownerDocument.body,
                width = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                  html.scrollWidth,
                  html.clientWidth,
                  body.scrollWidth,
                  body.clientWidth,
                ),
                height = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                  html.scrollHeight,
                  html.clientHeight,
                  body.scrollHeight,
                  body.clientHeight,
                );
              let x = -scroll.scrollLeft + getWindowScrollBarX(element);
              const y = -scroll.scrollTop;
              return (
                'rtl' ===
                  (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(body)
                    .direction &&
                  (x +=
                    (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                      html.clientWidth,
                      body.clientWidth,
                    ) - width),
                { width, height, x, y }
              );
            })((0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(element));
          else if (
            (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
              clippingAncestor,
            )
          )
            rect = (function getInnerBoundingClientRect(element, strategy) {
              const clientRect = getBoundingClientRect(element, !0, 'fixed' === strategy),
                top = clientRect.top + element.clientTop,
                left = clientRect.left + element.clientLeft,
                scale = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(
                  element,
                )
                  ? getScale(element)
                  : (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(1);
              return {
                width: element.clientWidth * scale.x,
                height: element.clientHeight * scale.y,
                x: left * scale.x,
                y: top * scale.y,
              };
            })(clippingAncestor, strategy);
          else {
            const visualOffsets = getVisualOffsets(element);
            rect = {
              ...clippingAncestor,
              x: clippingAncestor.x - visualOffsets.x,
              y: clippingAncestor.y - visualOffsets.y,
            };
          }
          return (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.B1)(rect);
        }
        function hasFixedPositionAncestor(element, stopNode) {
          const parentNode = (0,
          _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.$4)(element);
          return (
            !(
              parentNode === stopNode ||
              !(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
                parentNode,
              ) ||
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.eu)(parentNode)
            ) &&
            ('fixed' ===
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(parentNode)
                .position ||
              hasFixedPositionAncestor(parentNode, stopNode))
          );
        }
        function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
          const isOffsetParentAnElement = (0,
            _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(offsetParent),
            documentElement = (0,
            _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(offsetParent),
            isFixed = 'fixed' === strategy,
            rect = getBoundingClientRect(element, !0, isFixed, offsetParent);
          let scroll = { scrollLeft: 0, scrollTop: 0 };
          const offsets = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(0);
          if (isOffsetParentAnElement || (!isOffsetParentAnElement && !isFixed))
            if (
              (('body' !==
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.mq)(
                  offsetParent,
                ) ||
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ZU)(
                  documentElement,
                )) &&
                (scroll = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.CP)(
                  offsetParent,
                )),
              isOffsetParentAnElement)
            ) {
              const offsetRect = getBoundingClientRect(offsetParent, !0, isFixed, offsetParent);
              (offsets.x = offsetRect.x + offsetParent.clientLeft),
                (offsets.y = offsetRect.y + offsetParent.clientTop);
            } else documentElement && (offsets.x = getWindowScrollBarX(documentElement));
          return {
            x: rect.left + scroll.scrollLeft - offsets.x,
            y: rect.top + scroll.scrollTop - offsets.y,
            width: rect.width,
            height: rect.height,
          };
        }
        function getTrueOffsetParent(element, polyfill) {
          return (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(
            element,
          ) &&
            'fixed' !==
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(element)
                .position
            ? polyfill
              ? polyfill(element)
              : element.offsetParent
            : null;
        }
        function getOffsetParent(element, polyfill) {
          const window = (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.zk)(
            element,
          );
          if (
            !(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(element) ||
            isTopLayer(element)
          )
            return window;
          let offsetParent = getTrueOffsetParent(element, polyfill);
          for (
            ;
            offsetParent &&
            (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.Lv)(
              offsetParent,
            ) &&
            'static' ===
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
                offsetParent,
              ).position;

          )
            offsetParent = getTrueOffsetParent(offsetParent, polyfill);
          return offsetParent &&
            ('html' ===
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.mq)(
                offsetParent,
              ) ||
              ('body' ===
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.mq)(
                  offsetParent,
                ) &&
                'static' ===
                  (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
                    offsetParent,
                  ).position &&
                !(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sQ)(
                  offsetParent,
                )))
            ? window
            : offsetParent ||
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.gJ)(
                  element,
                ) ||
                window;
        }
        const platform = {
          convertOffsetParentRelativeRectToViewportRelativeRect:
            function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
              let { elements, rect, offsetParent, strategy } = _ref;
              const isFixed = 'fixed' === strategy,
                documentElement = (0,
                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(offsetParent),
                topLayer = !!elements && isTopLayer(elements.floating);
              if (offsetParent === documentElement || (topLayer && isFixed)) return rect;
              let scroll = { scrollLeft: 0, scrollTop: 0 },
                scale = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(1);
              const offsets = (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.Jx)(
                  0,
                ),
                isOffsetParentAnElement = (0,
                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(offsetParent);
              if (
                (isOffsetParentAnElement || (!isOffsetParentAnElement && !isFixed)) &&
                (('body' !==
                  (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.mq)(
                    offsetParent,
                  ) ||
                  (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ZU)(
                    documentElement,
                  )) &&
                  (scroll = (0,
                  _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.CP)(
                    offsetParent,
                  )),
                (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sb)(
                  offsetParent,
                ))
              ) {
                const offsetRect = getBoundingClientRect(offsetParent);
                (scale = getScale(offsetParent)),
                  (offsets.x = offsetRect.x + offsetParent.clientLeft),
                  (offsets.y = offsetRect.y + offsetParent.clientTop);
              }
              return {
                width: rect.width * scale.x,
                height: rect.height * scale.y,
                x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
                y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y,
              };
            },
          getDocumentElement: _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep,
          getClippingRect: function getClippingRect(_ref) {
            let { element, boundary, rootBoundary, strategy } = _ref;
            const clippingAncestors = [
                ...('clippingAncestors' === boundary
                  ? (function getClippingElementAncestors(element, cache) {
                      const cachedResult = cache.get(element);
                      if (cachedResult) return cachedResult;
                      let result = (0,
                        _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.v9)(
                          element,
                          [],
                          !1,
                        ).filter(
                          (el) =>
                            (0,
                            _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
                              el,
                            ) &&
                            'body' !==
                              (0,
                              _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.mq)(
                                el,
                              ),
                        ),
                        currentContainingBlockComputedStyle = null;
                      const elementIsFixed =
                        'fixed' ===
                        (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
                          element,
                        ).position;
                      let currentNode = elementIsFixed
                        ? (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.$4)(
                            element,
                          )
                        : element;
                      for (
                        ;
                        (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq)(
                          currentNode,
                        ) &&
                        !(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.eu)(
                          currentNode,
                        );

                      ) {
                        const computedStyle = (0,
                          _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(
                            currentNode,
                          ),
                          currentNodeIsContaining = (0,
                          _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.sQ)(
                            currentNode,
                          );
                        currentNodeIsContaining ||
                          'fixed' !== computedStyle.position ||
                          (currentContainingBlockComputedStyle = null),
                          (
                            elementIsFixed
                              ? !currentNodeIsContaining && !currentContainingBlockComputedStyle
                              : (!currentNodeIsContaining &&
                                  'static' === computedStyle.position &&
                                  currentContainingBlockComputedStyle &&
                                  ['absolute', 'fixed'].includes(
                                    currentContainingBlockComputedStyle.position,
                                  )) ||
                                ((0,
                                _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ZU)(
                                  currentNode,
                                ) &&
                                  !currentNodeIsContaining &&
                                  hasFixedPositionAncestor(element, currentNode))
                          )
                            ? (result = result.filter((ancestor) => ancestor !== currentNode))
                            : (currentContainingBlockComputedStyle = computedStyle),
                          (currentNode = (0,
                          _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.$4)(
                            currentNode,
                          ));
                      }
                      return cache.set(element, result), result;
                    })(element, this._c)
                  : [].concat(boundary)),
                rootBoundary,
              ],
              firstClippingAncestor = clippingAncestors[0],
              clippingRect = clippingAncestors.reduce(
                (accRect, clippingAncestor) => {
                  const rect = getClientRectFromClippingAncestor(
                    element,
                    clippingAncestor,
                    strategy,
                  );
                  return (
                    (accRect.top = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                      rect.top,
                      accRect.top,
                    )),
                    (accRect.right = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.jk)(
                      rect.right,
                      accRect.right,
                    )),
                    (accRect.bottom = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.jk)(
                      rect.bottom,
                      accRect.bottom,
                    )),
                    (accRect.left = (0,
                    _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                      rect.left,
                      accRect.left,
                    )),
                    accRect
                  );
                },
                getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy),
              );
            return {
              width: clippingRect.right - clippingRect.left,
              height: clippingRect.bottom - clippingRect.top,
              x: clippingRect.left,
              y: clippingRect.top,
            };
          },
          getOffsetParent,
          getElementRects: async function (data) {
            const getOffsetParentFn = this.getOffsetParent || getOffsetParent,
              getDimensionsFn = this.getDimensions;
            return {
              reference: getRectRelativeToOffsetParent(
                data.reference,
                await getOffsetParentFn(data.floating),
                data.strategy,
              ),
              floating: { x: 0, y: 0, ...(await getDimensionsFn(data.floating)) },
            };
          },
          getClientRects: function getClientRects(element) {
            return Array.from(element.getClientRects());
          },
          getDimensions: function getDimensions(element) {
            const { width, height } = getCssDimensions(element);
            return { width, height };
          },
          getScale,
          isElement: _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.vq,
          isRTL: function isRTL(element) {
            return (
              'rtl' ===
              (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.L9)(element)
                .direction
            );
          },
        };
        function autoUpdate(reference, floating, update, options) {
          void 0 === options && (options = {});
          const {
              ancestorScroll = !0,
              ancestorResize = !0,
              elementResize = 'function' == typeof ResizeObserver,
              layoutShift = 'function' == typeof IntersectionObserver,
              animationFrame = !1,
            } = options,
            referenceEl = unwrapElement(reference),
            ancestors =
              ancestorScroll || ancestorResize
                ? [
                    ...(referenceEl
                      ? (0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.v9)(
                          referenceEl,
                        )
                      : []),
                    ...(0, _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.v9)(
                      floating,
                    ),
                  ]
                : [];
          ancestors.forEach((ancestor) => {
            ancestorScroll && ancestor.addEventListener('scroll', update, { passive: !0 }),
              ancestorResize && ancestor.addEventListener('resize', update);
          });
          const cleanupIo =
            referenceEl && layoutShift
              ? (function observeMove(element, onMove) {
                  let timeoutId,
                    io = null;
                  const root = (0,
                  _utils_dist_floating_ui_utils_dom_js__WEBPACK_IMPORTED_MODULE_0__.ep)(element);
                  function cleanup() {
                    var _io;
                    clearTimeout(timeoutId), null == (_io = io) || _io.disconnect(), (io = null);
                  }
                  return (
                    (function refresh(skip, threshold) {
                      void 0 === skip && (skip = !1),
                        void 0 === threshold && (threshold = 1),
                        cleanup();
                      const { left, top, width, height } = element.getBoundingClientRect();
                      if ((skip || onMove(), !width || !height)) return;
                      const options = {
                        rootMargin:
                          -(0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.RI)(
                            top,
                          ) +
                          'px ' +
                          -(0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.RI)(
                            root.clientWidth - (left + width),
                          ) +
                          'px ' +
                          -(0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.RI)(
                            root.clientHeight - (top + height),
                          ) +
                          'px ' +
                          -(0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.RI)(
                            left,
                          ) +
                          'px',
                        threshold:
                          (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.T9)(
                            0,
                            (0, _utils_dist_floating_ui_utils_js__WEBPACK_IMPORTED_MODULE_1__.jk)(
                              1,
                              threshold,
                            ),
                          ) || 1,
                      };
                      let isFirstUpdate = !0;
                      function handleObserve(entries) {
                        const ratio = entries[0].intersectionRatio;
                        if (ratio !== threshold) {
                          if (!isFirstUpdate) return refresh();
                          ratio
                            ? refresh(!1, ratio)
                            : (timeoutId = setTimeout(() => {
                                refresh(!1, 1e-7);
                              }, 100));
                        }
                        isFirstUpdate = !1;
                      }
                      try {
                        io = new IntersectionObserver(handleObserve, {
                          ...options,
                          root: root.ownerDocument,
                        });
                      } catch (e) {
                        io = new IntersectionObserver(handleObserve, options);
                      }
                      io.observe(element);
                    })(!0),
                    cleanup
                  );
                })(referenceEl, update)
              : null;
          let frameId,
            reobserveFrame = -1,
            resizeObserver = null;
          elementResize &&
            ((resizeObserver = new ResizeObserver((_ref) => {
              let [firstEntry] = _ref;
              firstEntry &&
                firstEntry.target === referenceEl &&
                resizeObserver &&
                (resizeObserver.unobserve(floating),
                cancelAnimationFrame(reobserveFrame),
                (reobserveFrame = requestAnimationFrame(() => {
                  var _resizeObserver;
                  null == (_resizeObserver = resizeObserver) || _resizeObserver.observe(floating);
                }))),
                update();
            })),
            referenceEl && !animationFrame && resizeObserver.observe(referenceEl),
            resizeObserver.observe(floating));
          let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
          return (
            animationFrame &&
              (function frameLoop() {
                const nextRefRect = getBoundingClientRect(reference);
                !prevRefRect ||
                  (nextRefRect.x === prevRefRect.x &&
                    nextRefRect.y === prevRefRect.y &&
                    nextRefRect.width === prevRefRect.width &&
                    nextRefRect.height === prevRefRect.height) ||
                  update();
                (prevRefRect = nextRefRect), (frameId = requestAnimationFrame(frameLoop));
              })(),
            update(),
            () => {
              var _resizeObserver2;
              ancestors.forEach((ancestor) => {
                ancestorScroll && ancestor.removeEventListener('scroll', update),
                  ancestorResize && ancestor.removeEventListener('resize', update);
              }),
                null == cleanupIo || cleanupIo(),
                null == (_resizeObserver2 = resizeObserver) || _resizeObserver2.disconnect(),
                (resizeObserver = null),
                animationFrame && cancelAnimationFrame(frameId);
            }
          );
        }
        const shift = _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__.BN,
          flip = _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__.UU,
          size = _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__.Ej,
          arrow = _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__.UE,
          computePosition = (reference, floating, options) => {
            const cache = new Map(),
              mergedOptions = { platform, ...options },
              platformWithCache = { ...mergedOptions.platform, _c: cache };
            return (0, _core_dist_floating_ui_core_js__WEBPACK_IMPORTED_MODULE_2__.rD)(
              reference,
              floating,
              { ...mergedOptions, platform: platformWithCache },
            );
          };
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { UE: () => arrow, we: () => useFloating });
        var _dom_dist_floating_ui_dom_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/dom/dist/floating-ui.dom.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react-dom/index.js',
          );
        const arrow = (options) => ({
          name: 'arrow',
          options,
          fn(state) {
            const { element, padding } = 'function' == typeof options ? options(state) : options;
            return element &&
              (function isRef(value) {
                return {}.hasOwnProperty.call(value, 'current');
              })(element)
              ? null != element.current
                ? (0, _dom_dist_floating_ui_dom_js__WEBPACK_IMPORTED_MODULE_2__.UE)({
                    element: element.current,
                    padding,
                  }).fn(state)
                : {}
              : element
                ? (0, _dom_dist_floating_ui_dom_js__WEBPACK_IMPORTED_MODULE_2__.UE)({
                    element,
                    padding,
                  }).fn(state)
                : {};
          },
        });
        var index =
          'undefined' != typeof document
            ? react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect
            : react__WEBPACK_IMPORTED_MODULE_0__.useEffect;
        function deepEqual(a, b) {
          if (a === b) return !0;
          if (typeof a != typeof b) return !1;
          if ('function' == typeof a && a.toString() === b.toString()) return !0;
          let length, i, keys;
          if (a && b && 'object' == typeof a) {
            if (Array.isArray(a)) {
              if (((length = a.length), length !== b.length)) return !1;
              for (i = length; 0 != i--; ) if (!deepEqual(a[i], b[i])) return !1;
              return !0;
            }
            if (((keys = Object.keys(a)), (length = keys.length), length !== Object.keys(b).length))
              return !1;
            for (i = length; 0 != i--; ) if (!{}.hasOwnProperty.call(b, keys[i])) return !1;
            for (i = length; 0 != i--; ) {
              const key = keys[i];
              if (('_owner' !== key || !a.$$typeof) && !deepEqual(a[key], b[key])) return !1;
            }
            return !0;
          }
          return a != a && b != b;
        }
        function getDPR(element) {
          if ('undefined' == typeof window) return 1;
          return (element.ownerDocument.defaultView || window).devicePixelRatio || 1;
        }
        function roundByDPR(element, value) {
          const dpr = getDPR(element);
          return Math.round(value * dpr) / dpr;
        }
        function useLatestRef(value) {
          const ref = react__WEBPACK_IMPORTED_MODULE_0__.useRef(value);
          return (
            index(() => {
              ref.current = value;
            }),
            ref
          );
        }
        function useFloating(options) {
          void 0 === options && (options = {});
          const {
              placement = 'bottom',
              strategy = 'absolute',
              middleware = [],
              platform,
              elements: { reference: externalReference, floating: externalFloating } = {},
              transform = !0,
              whileElementsMounted,
              open,
            } = options,
            [data, setData] = react__WEBPACK_IMPORTED_MODULE_0__.useState({
              x: 0,
              y: 0,
              strategy,
              placement,
              middlewareData: {},
              isPositioned: !1,
            }),
            [latestMiddleware, setLatestMiddleware] =
              react__WEBPACK_IMPORTED_MODULE_0__.useState(middleware);
          deepEqual(latestMiddleware, middleware) || setLatestMiddleware(middleware);
          const [_reference, _setReference] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null),
            [_floating, _setFloating] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null),
            setReference = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((node) => {
              node !== referenceRef.current && ((referenceRef.current = node), _setReference(node));
            }, []),
            setFloating = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((node) => {
              node !== floatingRef.current && ((floatingRef.current = node), _setFloating(node));
            }, []),
            referenceEl = externalReference || _reference,
            floatingEl = externalFloating || _floating,
            referenceRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null),
            floatingRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null),
            dataRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(data),
            hasWhileElementsMounted = null != whileElementsMounted,
            whileElementsMountedRef = useLatestRef(whileElementsMounted),
            platformRef = useLatestRef(platform),
            update = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
              if (!referenceRef.current || !floatingRef.current) return;
              const config = { placement, strategy, middleware: latestMiddleware };
              platformRef.current && (config.platform = platformRef.current),
                (0, _dom_dist_floating_ui_dom_js__WEBPACK_IMPORTED_MODULE_2__.rD)(
                  referenceRef.current,
                  floatingRef.current,
                  config,
                ).then((data) => {
                  const fullData = { ...data, isPositioned: !0 };
                  isMountedRef.current &&
                    !deepEqual(dataRef.current, fullData) &&
                    ((dataRef.current = fullData),
                    react_dom__WEBPACK_IMPORTED_MODULE_1__.flushSync(() => {
                      setData(fullData);
                    }));
                });
            }, [latestMiddleware, placement, strategy, platformRef]);
          index(() => {
            !1 === open &&
              dataRef.current.isPositioned &&
              ((dataRef.current.isPositioned = !1),
              setData((data) => ({ ...data, isPositioned: !1 })));
          }, [open]);
          const isMountedRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(!1);
          index(
            () => (
              (isMountedRef.current = !0),
              () => {
                isMountedRef.current = !1;
              }
            ),
            [],
          ),
            index(() => {
              if (
                (referenceEl && (referenceRef.current = referenceEl),
                floatingEl && (floatingRef.current = floatingEl),
                referenceEl && floatingEl)
              ) {
                if (whileElementsMountedRef.current)
                  return whileElementsMountedRef.current(referenceEl, floatingEl, update);
                update();
              }
            }, [referenceEl, floatingEl, update, whileElementsMountedRef, hasWhileElementsMounted]);
          const refs = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(
              () => ({ reference: referenceRef, floating: floatingRef, setReference, setFloating }),
              [setReference, setFloating],
            ),
            elements = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(
              () => ({ reference: referenceEl, floating: floatingEl }),
              [referenceEl, floatingEl],
            ),
            floatingStyles = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
              const initialStyles = { position: strategy, left: 0, top: 0 };
              if (!elements.floating) return initialStyles;
              const x = roundByDPR(elements.floating, data.x),
                y = roundByDPR(elements.floating, data.y);
              return transform
                ? {
                    ...initialStyles,
                    transform: 'translate(' + x + 'px, ' + y + 'px)',
                    ...(getDPR(elements.floating) >= 1.5 && { willChange: 'transform' }),
                  }
                : { position: strategy, left: x, top: y };
            }, [strategy, transform, elements.floating, data.x, data.y]);
          return react__WEBPACK_IMPORTED_MODULE_0__.useMemo(
            () => ({ ...data, update, refs, elements, floatingStyles }),
            [data, update, refs, elements, floatingStyles],
          );
        }
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react/dist/floating-ui.react.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, {
          s3: () => FloatingFocusManager,
          XF: () => FloatingPortal,
          kp: () => useClick,
          s9: () => useDismiss,
          we: () => useFloating,
          iQ: () => useFocus,
          bv: () => useInteractions,
          C1: () => useListNavigation,
          SV: () => useMergeRefs,
          It: () => useRole,
        });
        var react = __webpack_require__('../../../node_modules/react/index.js'),
          react_namespaceObject = __webpack_require__.t(react, 2),
          floating_ui_utils_dom = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.js',
          );
        function activeElement(doc) {
          let activeElement = doc.activeElement;
          for (
            ;
            null !=
            (null == (_activeElement = activeElement) ||
            null == (_activeElement = _activeElement.shadowRoot)
              ? void 0
              : _activeElement.activeElement);

          ) {
            var _activeElement;
            activeElement = activeElement.shadowRoot.activeElement;
          }
          return activeElement;
        }
        function floating_ui_react_utils_contains(parent, child) {
          if (!parent || !child) return !1;
          const rootNode = null == child.getRootNode ? void 0 : child.getRootNode();
          if (parent.contains(child)) return !0;
          if (rootNode && (0, floating_ui_utils_dom.Ng)(rootNode)) {
            let next = child;
            for (; next; ) {
              if (parent === next) return !0;
              next = next.parentNode || next.host;
            }
          }
          return !1;
        }
        function getPlatform() {
          const uaData = navigator.userAgentData;
          return null != uaData && uaData.platform ? uaData.platform : navigator.platform;
        }
        function getUserAgent() {
          const uaData = navigator.userAgentData;
          return uaData && Array.isArray(uaData.brands)
            ? uaData.brands
                .map((_ref) => {
                  let { brand, version } = _ref;
                  return brand + '/' + version;
                })
                .join(' ')
            : navigator.userAgent;
        }
        function isVirtualClick(event) {
          return (
            !(0 !== event.mozInputSource || !event.isTrusted) ||
            (isAndroid() && event.pointerType
              ? 'click' === event.type && 1 === event.buttons
              : 0 === event.detail && !event.pointerType)
          );
        }
        function isVirtualPointerEvent(event) {
          return (
            !(function isJSDOM() {
              return getUserAgent().includes('jsdom/');
            })() &&
            ((!isAndroid() && 0 === event.width && 0 === event.height) ||
              (isAndroid() &&
                1 === event.width &&
                1 === event.height &&
                0 === event.pressure &&
                0 === event.detail &&
                'mouse' === event.pointerType) ||
              (event.width < 1 &&
                event.height < 1 &&
                0 === event.pressure &&
                0 === event.detail &&
                'touch' === event.pointerType))
          );
        }
        function isSafari() {
          return /apple/i.test(navigator.vendor);
        }
        function isAndroid() {
          const re = /android/i;
          return re.test(getPlatform()) || re.test(getUserAgent());
        }
        function isMac() {
          return getPlatform().toLowerCase().startsWith('mac') && !navigator.maxTouchPoints;
        }
        function floating_ui_react_utils_isMouseLikePointerType(pointerType, strict) {
          const values = ['mouse', 'pen'];
          return strict || values.push('', void 0), values.includes(pointerType);
        }
        function floating_ui_react_utils_getDocument(node) {
          return (null == node ? void 0 : node.ownerDocument) || document;
        }
        function isEventTargetWithin(event, node) {
          if (null == node) return !1;
          if ('composedPath' in event) return event.composedPath().includes(node);
          const e = event;
          return null != e.target && node.contains(e.target);
        }
        function getTarget(event) {
          return 'composedPath' in event ? event.composedPath()[0] : event.target;
        }
        const TYPEABLE_SELECTOR =
          "input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])";
        function isTypeableElement(element) {
          return (0, floating_ui_utils_dom.sb)(element) && element.matches(TYPEABLE_SELECTOR);
        }
        function stopEvent(event) {
          event.preventDefault(), event.stopPropagation();
        }
        function isTypeableCombobox(element) {
          return (
            !!element && 'combobox' === element.getAttribute('role') && isTypeableElement(element)
          );
        }
        var floating_ui_utils = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.js',
          ),
          floating_ui_react_dom = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.js',
          ),
          candidateSelector = [
            'input:not([inert])',
            'select:not([inert])',
            'textarea:not([inert])',
            'a[href]:not([inert])',
            'button:not([inert])',
            '[tabindex]:not(slot):not([inert])',
            'audio[controls]:not([inert])',
            'video[controls]:not([inert])',
            '[contenteditable]:not([contenteditable="false"]):not([inert])',
            'details>summary:first-of-type:not([inert])',
            'details:not([inert])',
          ].join(','),
          NoElement = 'undefined' == typeof Element,
          matches = NoElement
            ? function () {}
            : Element.prototype.matches ||
              Element.prototype.msMatchesSelector ||
              Element.prototype.webkitMatchesSelector,
          getRootNode =
            !NoElement && Element.prototype.getRootNode
              ? function (element) {
                  var _element$getRootNode;
                  return null == element ||
                    null === (_element$getRootNode = element.getRootNode) ||
                    void 0 === _element$getRootNode
                    ? void 0
                    : _element$getRootNode.call(element);
                }
              : function (element) {
                  return null == element ? void 0 : element.ownerDocument;
                },
          isInert = function isInert(node, lookUp) {
            var _node$getAttribute;
            void 0 === lookUp && (lookUp = !0);
            var inertAtt =
              null == node ||
              null === (_node$getAttribute = node.getAttribute) ||
              void 0 === _node$getAttribute
                ? void 0
                : _node$getAttribute.call(node, 'inert');
            return (
              '' === inertAtt || 'true' === inertAtt || (lookUp && node && isInert(node.parentNode))
            );
          },
          getCandidatesIteratively = function getCandidatesIteratively(
            elements,
            includeContainer,
            options,
          ) {
            for (
              var candidates = [], elementsToCheck = Array.from(elements);
              elementsToCheck.length;

            ) {
              var element = elementsToCheck.shift();
              if (!isInert(element, !1))
                if ('SLOT' === element.tagName) {
                  var assigned = element.assignedElements(),
                    nestedCandidates = getCandidatesIteratively(
                      assigned.length ? assigned : element.children,
                      !0,
                      options,
                    );
                  options.flatten
                    ? candidates.push.apply(candidates, nestedCandidates)
                    : candidates.push({ scopeParent: element, candidates: nestedCandidates });
                } else {
                  matches.call(element, candidateSelector) &&
                    options.filter(element) &&
                    (includeContainer || !elements.includes(element)) &&
                    candidates.push(element);
                  var shadowRoot =
                      element.shadowRoot ||
                      ('function' == typeof options.getShadowRoot &&
                        options.getShadowRoot(element)),
                    validShadowRoot =
                      !isInert(shadowRoot, !1) &&
                      (!options.shadowRootFilter || options.shadowRootFilter(element));
                  if (shadowRoot && validShadowRoot) {
                    var _nestedCandidates = getCandidatesIteratively(
                      !0 === shadowRoot ? element.children : shadowRoot.children,
                      !0,
                      options,
                    );
                    options.flatten
                      ? candidates.push.apply(candidates, _nestedCandidates)
                      : candidates.push({ scopeParent: element, candidates: _nestedCandidates });
                  } else elementsToCheck.unshift.apply(elementsToCheck, element.children);
                }
            }
            return candidates;
          },
          hasTabIndex = function hasTabIndex(node) {
            return !isNaN(parseInt(node.getAttribute('tabindex'), 10));
          },
          getTabIndex = function getTabIndex(node) {
            if (!node) throw new Error('No node provided');
            return node.tabIndex < 0 &&
              (/^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) ||
                (function isContentEditable(node) {
                  var _node$getAttribute2,
                    attValue =
                      null == node ||
                      null === (_node$getAttribute2 = node.getAttribute) ||
                      void 0 === _node$getAttribute2
                        ? void 0
                        : _node$getAttribute2.call(node, 'contenteditable');
                  return '' === attValue || 'true' === attValue;
                })(node)) &&
              !hasTabIndex(node)
              ? 0
              : node.tabIndex;
          },
          sortOrderedTabbables = function sortOrderedTabbables(a, b) {
            return a.tabIndex === b.tabIndex
              ? a.documentOrder - b.documentOrder
              : a.tabIndex - b.tabIndex;
          },
          isInput = function isInput(node) {
            return 'INPUT' === node.tagName;
          },
          isNonTabbableRadio = function isNonTabbableRadio(node) {
            return (
              (function isRadio(node) {
                return isInput(node) && 'radio' === node.type;
              })(node) &&
              !(function isTabbableRadio(node) {
                if (!node.name) return !0;
                var radioSet,
                  radioScope = node.form || getRootNode(node),
                  queryRadios = function queryRadios(name) {
                    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
                  };
                if (
                  'undefined' != typeof window &&
                  void 0 !== window.CSS &&
                  'function' == typeof window.CSS.escape
                )
                  radioSet = queryRadios(window.CSS.escape(node.name));
                else
                  try {
                    radioSet = queryRadios(node.name);
                  } catch (err) {
                    return (
                      console.error(
                        'Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s',
                        err.message,
                      ),
                      !1
                    );
                  }
                var checked = (function getCheckedRadio(nodes, form) {
                  for (var i = 0; i < nodes.length; i++)
                    if (nodes[i].checked && nodes[i].form === form) return nodes[i];
                })(radioSet, node.form);
                return !checked || checked === node;
              })(node)
            );
          },
          isZeroArea = function isZeroArea(node) {
            var _node$getBoundingClie = node.getBoundingClientRect(),
              width = _node$getBoundingClie.width,
              height = _node$getBoundingClie.height;
            return 0 === width && 0 === height;
          },
          isHidden = function isHidden(node, _ref) {
            var displayCheck = _ref.displayCheck,
              getShadowRoot = _ref.getShadowRoot;
            if ('hidden' === getComputedStyle(node).visibility) return !0;
            var nodeUnderDetails = matches.call(node, 'details>summary:first-of-type')
              ? node.parentElement
              : node;
            if (matches.call(nodeUnderDetails, 'details:not([open]) *')) return !0;
            if (displayCheck && 'full' !== displayCheck && 'legacy-full' !== displayCheck) {
              if ('non-zero-area' === displayCheck) return isZeroArea(node);
            } else {
              if ('function' == typeof getShadowRoot) {
                for (var originalNode = node; node; ) {
                  var parentElement = node.parentElement,
                    rootNode = getRootNode(node);
                  if (
                    parentElement &&
                    !parentElement.shadowRoot &&
                    !0 === getShadowRoot(parentElement)
                  )
                    return isZeroArea(node);
                  node = node.assignedSlot
                    ? node.assignedSlot
                    : parentElement || rootNode === node.ownerDocument
                      ? parentElement
                      : rootNode.host;
                }
                node = originalNode;
              }
              if (
                (function isNodeAttached(node) {
                  var _nodeRoot,
                    _nodeRootHost,
                    _nodeRootHost$ownerDo,
                    _node$ownerDocument,
                    nodeRoot = node && getRootNode(node),
                    nodeRootHost =
                      null === (_nodeRoot = nodeRoot) || void 0 === _nodeRoot
                        ? void 0
                        : _nodeRoot.host,
                    attached = !1;
                  if (nodeRoot && nodeRoot !== node)
                    for (
                      attached = !!(
                        (null !== (_nodeRootHost = nodeRootHost) &&
                          void 0 !== _nodeRootHost &&
                          null !== (_nodeRootHost$ownerDo = _nodeRootHost.ownerDocument) &&
                          void 0 !== _nodeRootHost$ownerDo &&
                          _nodeRootHost$ownerDo.contains(nodeRootHost)) ||
                        (null != node &&
                          null !== (_node$ownerDocument = node.ownerDocument) &&
                          void 0 !== _node$ownerDocument &&
                          _node$ownerDocument.contains(node))
                      );
                      !attached && nodeRootHost;

                    ) {
                      var _nodeRoot2, _nodeRootHost2, _nodeRootHost2$ownerD;
                      attached = !(
                        null ===
                          (_nodeRootHost2 = nodeRootHost =
                            null === (_nodeRoot2 = nodeRoot = getRootNode(nodeRootHost)) ||
                            void 0 === _nodeRoot2
                              ? void 0
                              : _nodeRoot2.host) ||
                        void 0 === _nodeRootHost2 ||
                        null === (_nodeRootHost2$ownerD = _nodeRootHost2.ownerDocument) ||
                        void 0 === _nodeRootHost2$ownerD ||
                        !_nodeRootHost2$ownerD.contains(nodeRootHost)
                      );
                    }
                  return attached;
                })(node)
              )
                return !node.getClientRects().length;
              if ('legacy-full' !== displayCheck) return !0;
            }
            return !1;
          },
          isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(
            options,
            node,
          ) {
            return !(
              node.disabled ||
              isInert(node) ||
              (function isHiddenInput(node) {
                return isInput(node) && 'hidden' === node.type;
              })(node) ||
              isHidden(node, options) ||
              (function isDetailsWithSummary(node) {
                return (
                  'DETAILS' === node.tagName &&
                  Array.prototype.slice.apply(node.children).some(function (child) {
                    return 'SUMMARY' === child.tagName;
                  })
                );
              })(node) ||
              (function isDisabledFromFieldset(node) {
                if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName))
                  for (var parentNode = node.parentElement; parentNode; ) {
                    if ('FIELDSET' === parentNode.tagName && parentNode.disabled) {
                      for (var i = 0; i < parentNode.children.length; i++) {
                        var child = parentNode.children.item(i);
                        if ('LEGEND' === child.tagName)
                          return (
                            !!matches.call(parentNode, 'fieldset[disabled] *') ||
                            !child.contains(node)
                          );
                      }
                      return !0;
                    }
                    parentNode = parentNode.parentElement;
                  }
                return !1;
              })(node)
            );
          },
          isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
            return !(
              isNonTabbableRadio(node) ||
              getTabIndex(node) < 0 ||
              !isNodeMatchingSelectorFocusable(options, node)
            );
          },
          isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
            var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);
            return !!(isNaN(tabIndex) || tabIndex >= 0);
          },
          sortByOrder = function sortByOrder(candidates) {
            var regularTabbables = [],
              orderedTabbables = [];
            return (
              candidates.forEach(function (item, i) {
                var isScope = !!item.scopeParent,
                  element = isScope ? item.scopeParent : item,
                  candidateTabindex = (function getSortOrderTabIndex(node, isScope) {
                    var tabIndex = getTabIndex(node);
                    return tabIndex < 0 && isScope && !hasTabIndex(node) ? 0 : tabIndex;
                  })(element, isScope),
                  elements = isScope ? sortByOrder(item.candidates) : element;
                0 === candidateTabindex
                  ? isScope
                    ? regularTabbables.push.apply(regularTabbables, elements)
                    : regularTabbables.push(element)
                  : orderedTabbables.push({
                      documentOrder: i,
                      tabIndex: candidateTabindex,
                      item,
                      isScope,
                      content: elements,
                    });
              }),
              orderedTabbables
                .sort(sortOrderedTabbables)
                .reduce(function (acc, sortable) {
                  return (
                    sortable.isScope
                      ? acc.push.apply(acc, sortable.content)
                      : acc.push(sortable.content),
                    acc
                  );
                }, [])
                .concat(regularTabbables)
            );
          },
          tabbable = function tabbable(container, options) {
            var candidates;
            return (
              (candidates = (options = options || {}).getShadowRoot
                ? getCandidatesIteratively([container], options.includeContainer, {
                    filter: isNodeMatchingSelectorTabbable.bind(null, options),
                    flatten: !1,
                    getShadowRoot: options.getShadowRoot,
                    shadowRootFilter: isValidShadowRootTabbable,
                  })
                : (function getCandidates(el, includeContainer, filter) {
                    if (isInert(el)) return [];
                    var candidates = Array.prototype.slice.apply(
                      el.querySelectorAll(candidateSelector),
                    );
                    return (
                      includeContainer &&
                        matches.call(el, candidateSelector) &&
                        candidates.unshift(el),
                      candidates.filter(filter)
                    );
                  })(
                    container,
                    options.includeContainer,
                    isNodeMatchingSelectorTabbable.bind(null, options),
                  )),
              sortByOrder(candidates)
            );
          },
          isTabbable = function isTabbable(node, options) {
            if (((options = options || {}), !node)) throw new Error('No node provided');
            return (
              !1 !== matches.call(node, candidateSelector) &&
              isNodeMatchingSelectorTabbable(options, node)
            );
          },
          react_dom = __webpack_require__('../../../node_modules/react-dom/index.js');
        function useMergeRefs(refs) {
          return react.useMemo(
            () =>
              refs.every((ref) => null == ref)
                ? null
                : (value) => {
                    refs.forEach((ref) => {
                      'function' == typeof ref ? ref(value) : null != ref && (ref.current = value);
                    });
                  },
            refs,
          );
        }
        const SafeReact = { ...react_namespaceObject },
          useSafeInsertionEffect = SafeReact.useInsertionEffect || ((fn) => fn());
        function useEffectEvent(callback) {
          const ref = react.useRef(() => {
            0;
          });
          return (
            useSafeInsertionEffect(() => {
              ref.current = callback;
            }),
            react.useCallback(function () {
              for (
                var _len = arguments.length, args = new Array(_len), _key = 0;
                _key < _len;
                _key++
              )
                args[_key] = arguments[_key];
              return null == ref.current ? void 0 : ref.current(...args);
            }, [])
          );
        }
        const ARROW_UP = 'ArrowUp',
          ARROW_DOWN = 'ArrowDown',
          ARROW_LEFT = 'ArrowLeft',
          ARROW_RIGHT = 'ArrowRight';
        function isDifferentRow(index, cols, prevRow) {
          return Math.floor(index / cols) !== prevRow;
        }
        function isIndexOutOfBounds(listRef, index) {
          return index < 0 || index >= listRef.current.length;
        }
        function getMinIndex(listRef, disabledIndices) {
          return findNonDisabledIndex(listRef, { disabledIndices });
        }
        function getMaxIndex(listRef, disabledIndices) {
          return findNonDisabledIndex(listRef, {
            decrement: !0,
            startingIndex: listRef.current.length,
            disabledIndices,
          });
        }
        function findNonDisabledIndex(listRef, _temp) {
          let {
            startingIndex = -1,
            decrement = !1,
            disabledIndices,
            amount = 1,
          } = void 0 === _temp ? {} : _temp;
          const list = listRef.current,
            isDisabledIndex = disabledIndices
              ? (index) => disabledIndices.includes(index)
              : (index) => {
                  const element = list[index];
                  return (
                    null == element ||
                    element.hasAttribute('disabled') ||
                    'true' === element.getAttribute('aria-disabled')
                  );
                };
          let index = startingIndex;
          do {
            index += decrement ? -amount : amount;
          } while (index >= 0 && index <= list.length - 1 && isDisabledIndex(index));
          return index;
        }
        function getCellIndexOfCorner(index, sizes, cellMap, cols, corner) {
          if (-1 === index) return -1;
          const firstCellIndex = cellMap.indexOf(index);
          switch (corner) {
            case 'tl':
              return firstCellIndex;
            case 'tr':
              return firstCellIndex + sizes[index].width - 1;
            case 'bl':
              return firstCellIndex + (sizes[index].height - 1) * cols;
            case 'br':
              return cellMap.lastIndexOf(index);
          }
        }
        function getCellIndices(indices, cellMap) {
          return cellMap.flatMap((index, cellIndex) =>
            indices.includes(index) ? [cellIndex] : [],
          );
        }
        let rafId = 0;
        function enqueueFocus(el, options) {
          void 0 === options && (options = {});
          const { preventScroll = !1, cancelPrevious = !0, sync = !1 } = options;
          cancelPrevious && cancelAnimationFrame(rafId);
          const exec = () => (null == el ? void 0 : el.focus({ preventScroll }));
          sync ? exec() : (rafId = requestAnimationFrame(exec));
        }
        var index = 'undefined' != typeof document ? react.useLayoutEffect : react.useEffect;
        function _extends() {
          return (
            (_extends = Object.assign
              ? Object.assign.bind()
              : function (target) {
                  for (var i = 1; i < arguments.length; i++) {
                    var source = arguments[i];
                    for (var key in source)
                      Object.prototype.hasOwnProperty.call(source, key) &&
                        (target[key] = source[key]);
                  }
                  return target;
                }),
            _extends.apply(this, arguments)
          );
        }
        let serverHandoffComplete = !1,
          count = 0;
        const genId = () => 'floating-ui-' + Math.random().toString(36).slice(2, 6) + count++;
        const useId =
          SafeReact.useId ||
          function useFloatingId() {
            const [id, setId] = react.useState(() => (serverHandoffComplete ? genId() : void 0));
            return (
              index(() => {
                null == id && setId(genId());
              }, []),
              react.useEffect(() => {
                serverHandoffComplete = !0;
              }, []),
              id
            );
          };
        const FloatingNodeContext = react.createContext(null),
          FloatingTreeContext = react.createContext(null),
          useFloatingParentNodeId = () => {
            var _React$useContext;
            return (
              (null == (_React$useContext = react.useContext(FloatingNodeContext))
                ? void 0
                : _React$useContext.id) || null
            );
          },
          useFloatingTree = () => react.useContext(FloatingTreeContext);
        function createAttribute(name) {
          return 'data-floating-ui-' + name;
        }
        function useLatestRef(value) {
          const ref = (0, react.useRef)(value);
          return (
            index(() => {
              ref.current = value;
            }),
            ref
          );
        }
        function getChildren(nodes, id) {
          let allChildren = nodes.filter((node) => {
              var _node$context;
              return (
                node.parentId === id &&
                (null == (_node$context = node.context) ? void 0 : _node$context.open)
              );
            }),
            currentChildren = allChildren;
          for (; currentChildren.length; )
            (currentChildren = nodes.filter((node) => {
              var _currentChildren;
              return null == (_currentChildren = currentChildren)
                ? void 0
                : _currentChildren.some((n) => {
                    var _node$context2;
                    return (
                      node.parentId === n.id &&
                      (null == (_node$context2 = node.context) ? void 0 : _node$context2.open)
                    );
                  });
            })),
              (allChildren = allChildren.concat(currentChildren));
          return allChildren;
        }
        let counterMap = new WeakMap(),
          uncontrolledElementsSet = new WeakSet(),
          markerMap = {},
          lockCount = 0;
        const supportsInert = () =>
            'undefined' != typeof HTMLElement && 'inert' in HTMLElement.prototype,
          unwrapHost = (node) => node && (node.host || unwrapHost(node.parentNode)),
          correctElements = (parent, targets) =>
            targets
              .map((target) => {
                if (parent.contains(target)) return target;
                const correctedTarget = unwrapHost(target);
                return parent.contains(correctedTarget) ? correctedTarget : null;
              })
              .filter((x) => null != x);
        function markOthers(avoidElements, ariaHidden, inert) {
          void 0 === ariaHidden && (ariaHidden = !1), void 0 === inert && (inert = !1);
          const body = floating_ui_react_utils_getDocument(avoidElements[0]).body;
          return (function applyAttributeToOthers(
            uncorrectedAvoidElements,
            body,
            ariaHidden,
            inert,
          ) {
            const markerName = 'data-floating-ui-inert',
              controlAttribute = inert ? 'inert' : ariaHidden ? 'aria-hidden' : null,
              avoidElements = correctElements(body, uncorrectedAvoidElements),
              elementsToKeep = new Set(),
              elementsToStop = new Set(avoidElements),
              hiddenElements = [];
            markerMap[markerName] || (markerMap[markerName] = new WeakMap());
            const markerCounter = markerMap[markerName];
            return (
              avoidElements.forEach(function keep(el) {
                el &&
                  !elementsToKeep.has(el) &&
                  (elementsToKeep.add(el), el.parentNode && keep(el.parentNode));
              }),
              (function deep(parent) {
                parent &&
                  !elementsToStop.has(parent) &&
                  Array.prototype.forEach.call(parent.children, (node) => {
                    if (elementsToKeep.has(node)) deep(node);
                    else {
                      const attr = controlAttribute ? node.getAttribute(controlAttribute) : null,
                        alreadyHidden = null !== attr && 'false' !== attr,
                        counterValue = (counterMap.get(node) || 0) + 1,
                        markerValue = (markerCounter.get(node) || 0) + 1;
                      counterMap.set(node, counterValue),
                        markerCounter.set(node, markerValue),
                        hiddenElements.push(node),
                        1 === counterValue && alreadyHidden && uncontrolledElementsSet.add(node),
                        1 === markerValue && node.setAttribute(markerName, ''),
                        !alreadyHidden &&
                          controlAttribute &&
                          node.setAttribute(controlAttribute, 'true');
                    }
                  });
              })(body),
              elementsToKeep.clear(),
              lockCount++,
              () => {
                hiddenElements.forEach((element) => {
                  const counterValue = (counterMap.get(element) || 0) - 1,
                    markerValue = (markerCounter.get(element) || 0) - 1;
                  counterMap.set(element, counterValue),
                    markerCounter.set(element, markerValue),
                    counterValue ||
                      (!uncontrolledElementsSet.has(element) &&
                        controlAttribute &&
                        element.removeAttribute(controlAttribute),
                      uncontrolledElementsSet.delete(element)),
                    markerValue || element.removeAttribute(markerName);
                }),
                  lockCount--,
                  lockCount ||
                    ((counterMap = new WeakMap()),
                    (counterMap = new WeakMap()),
                    (uncontrolledElementsSet = new WeakSet()),
                    (markerMap = {}));
              }
            );
          })(
            avoidElements.concat(Array.from(body.querySelectorAll('[aria-live]'))),
            body,
            ariaHidden,
            inert,
          );
        }
        const getTabbableOptions = () => ({
          getShadowRoot: !0,
          displayCheck:
            'function' == typeof ResizeObserver &&
            ResizeObserver.toString().includes('[native code]')
              ? 'full'
              : 'none',
        });
        function getTabbableIn(container, direction) {
          const allTabbable = tabbable(container, getTabbableOptions());
          'prev' === direction && allTabbable.reverse();
          const activeIndex = allTabbable.indexOf(
            activeElement(floating_ui_react_utils_getDocument(container)),
          );
          return allTabbable.slice(activeIndex + 1)[0];
        }
        function getNextTabbable() {
          return getTabbableIn(document.body, 'next');
        }
        function getPreviousTabbable() {
          return getTabbableIn(document.body, 'prev');
        }
        function isOutsideEvent(event, container) {
          const containerElement = container || event.currentTarget,
            relatedTarget = event.relatedTarget;
          return (
            !relatedTarget || !floating_ui_react_utils_contains(containerElement, relatedTarget)
          );
        }
        function disableFocusInside(container) {
          tabbable(container, getTabbableOptions()).forEach((element) => {
            (element.dataset.tabindex = element.getAttribute('tabindex') || ''),
              element.setAttribute('tabindex', '-1');
          });
        }
        function enableFocusInside(container) {
          container.querySelectorAll('[data-tabindex]').forEach((element) => {
            const tabindex = element.dataset.tabindex;
            delete element.dataset.tabindex,
              tabindex
                ? element.setAttribute('tabindex', tabindex)
                : element.removeAttribute('tabindex');
          });
        }
        const HIDDEN_STYLES = {
          border: 0,
          clip: 'rect(0 0 0 0)',
          height: '1px',
          margin: '-1px',
          overflow: 'hidden',
          padding: 0,
          position: 'fixed',
          whiteSpace: 'nowrap',
          width: '1px',
          top: 0,
          left: 0,
        };
        function setActiveElementOnTab(event) {
          'Tab' === event.key && (event.target, clearTimeout(undefined));
        }
        const FocusGuard = react.forwardRef(function FocusGuard(props, ref) {
            const [role, setRole] = react.useState();
            index(
              () => (
                isSafari() && setRole('button'),
                document.addEventListener('keydown', setActiveElementOnTab),
                () => {
                  document.removeEventListener('keydown', setActiveElementOnTab);
                }
              ),
              [],
            );
            const restProps = {
              ref,
              tabIndex: 0,
              role,
              'aria-hidden': !role || void 0,
              [createAttribute('focus-guard')]: '',
              style: HIDDEN_STYLES,
            };
            return react.createElement('span', _extends({}, props, restProps));
          }),
          PortalContext = react.createContext(null),
          attr = createAttribute('portal');
        function FloatingPortal(props) {
          const { children, id, root = null, preserveTabOrder = !0 } = props,
            portalNode = (function useFloatingPortalNode(props) {
              void 0 === props && (props = {});
              const { id, root } = props,
                uniqueId = useId(),
                portalContext = usePortalContext(),
                [portalNode, setPortalNode] = react.useState(null),
                portalNodeRef = react.useRef(null);
              return (
                index(
                  () => () => {
                    null == portalNode || portalNode.remove(),
                      queueMicrotask(() => {
                        portalNodeRef.current = null;
                      });
                  },
                  [portalNode],
                ),
                index(() => {
                  if (portalNodeRef.current) return;
                  const existingIdRoot = id ? document.getElementById(id) : null;
                  if (!existingIdRoot) return;
                  const subRoot = document.createElement('div');
                  (subRoot.id = uniqueId),
                    subRoot.setAttribute(attr, ''),
                    existingIdRoot.appendChild(subRoot),
                    (portalNodeRef.current = subRoot),
                    setPortalNode(subRoot);
                }, [id, uniqueId]),
                index(() => {
                  if (portalNodeRef.current) return;
                  let container =
                    root || (null == portalContext ? void 0 : portalContext.portalNode);
                  container &&
                    !(0, floating_ui_utils_dom.vq)(container) &&
                    (container = container.current),
                    (container = container || document.body);
                  let idWrapper = null;
                  id &&
                    ((idWrapper = document.createElement('div')),
                    (idWrapper.id = id),
                    container.appendChild(idWrapper));
                  const subRoot = document.createElement('div');
                  (subRoot.id = uniqueId),
                    subRoot.setAttribute(attr, ''),
                    (container = idWrapper || container),
                    container.appendChild(subRoot),
                    (portalNodeRef.current = subRoot),
                    setPortalNode(subRoot);
                }, [id, root, uniqueId, portalContext]),
                portalNode
              );
            })({ id, root }),
            [focusManagerState, setFocusManagerState] = react.useState(null),
            beforeOutsideRef = react.useRef(null),
            afterOutsideRef = react.useRef(null),
            beforeInsideRef = react.useRef(null),
            afterInsideRef = react.useRef(null),
            shouldRenderGuards =
              !!focusManagerState &&
              !focusManagerState.modal &&
              focusManagerState.open &&
              preserveTabOrder &&
              !(!root && !portalNode);
          return (
            react.useEffect(() => {
              if (
                portalNode &&
                preserveTabOrder &&
                (null == focusManagerState || !focusManagerState.modal)
              )
                return (
                  portalNode.addEventListener('focusin', onFocus, !0),
                  portalNode.addEventListener('focusout', onFocus, !0),
                  () => {
                    portalNode.removeEventListener('focusin', onFocus, !0),
                      portalNode.removeEventListener('focusout', onFocus, !0);
                  }
                );
              function onFocus(event) {
                if (portalNode && isOutsideEvent(event)) {
                  ('focusin' === event.type ? enableFocusInside : disableFocusInside)(portalNode);
                }
              }
            }, [
              portalNode,
              preserveTabOrder,
              null == focusManagerState ? void 0 : focusManagerState.modal,
            ]),
            react.createElement(
              PortalContext.Provider,
              {
                value: react.useMemo(
                  () => ({
                    preserveTabOrder,
                    beforeOutsideRef,
                    afterOutsideRef,
                    beforeInsideRef,
                    afterInsideRef,
                    portalNode,
                    setFocusManagerState,
                  }),
                  [preserveTabOrder, portalNode],
                ),
              },
              shouldRenderGuards &&
                portalNode &&
                react.createElement(FocusGuard, {
                  'data-type': 'outside',
                  ref: beforeOutsideRef,
                  onFocus: (event) => {
                    if (isOutsideEvent(event, portalNode)) {
                      var _beforeInsideRef$curr;
                      null == (_beforeInsideRef$curr = beforeInsideRef.current) ||
                        _beforeInsideRef$curr.focus();
                    } else {
                      const prevTabbable =
                        getPreviousTabbable() ||
                        (null == focusManagerState
                          ? void 0
                          : focusManagerState.refs.domReference.current);
                      null == prevTabbable || prevTabbable.focus();
                    }
                  },
                }),
              shouldRenderGuards &&
                portalNode &&
                react.createElement('span', { 'aria-owns': portalNode.id, style: HIDDEN_STYLES }),
              portalNode && (0, react_dom.createPortal)(children, portalNode),
              shouldRenderGuards &&
                portalNode &&
                react.createElement(FocusGuard, {
                  'data-type': 'outside',
                  ref: afterOutsideRef,
                  onFocus: (event) => {
                    if (isOutsideEvent(event, portalNode)) {
                      var _afterInsideRef$curre;
                      null == (_afterInsideRef$curre = afterInsideRef.current) ||
                        _afterInsideRef$curre.focus();
                    } else {
                      const nextTabbable =
                        getNextTabbable() ||
                        (null == focusManagerState
                          ? void 0
                          : focusManagerState.refs.domReference.current);
                      null == nextTabbable || nextTabbable.focus(),
                        (null == focusManagerState ? void 0 : focusManagerState.closeOnFocusOut) &&
                          (null == focusManagerState ||
                            focusManagerState.onOpenChange(!1, event.nativeEvent));
                    }
                  },
                }),
            )
          );
        }
        const usePortalContext = () => react.useContext(PortalContext),
          LIST_LIMIT = 20;
        let previouslyFocusedElements = [];
        function addPreviouslyFocusedElement(element) {
          previouslyFocusedElements = previouslyFocusedElements.filter((el) => el.isConnected);
          let tabbableEl = element;
          if (tabbableEl && 'body' !== (0, floating_ui_utils_dom.mq)(tabbableEl)) {
            if (!isTabbable(tabbableEl, getTabbableOptions())) {
              const tabbableChild = tabbable(tabbableEl, getTabbableOptions())[0];
              if (!tabbableChild) return;
              tabbableEl = tabbableChild;
            }
            previouslyFocusedElements.push(tabbableEl),
              previouslyFocusedElements.length > LIST_LIMIT &&
                (previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT));
          }
        }
        function getPreviouslyFocusedElement() {
          return previouslyFocusedElements
            .slice()
            .reverse()
            .find((el) => el.isConnected);
        }
        const VisuallyHiddenDismiss = react.forwardRef(function VisuallyHiddenDismiss(props, ref) {
          return react.createElement(
            'button',
            _extends({}, props, { type: 'button', ref, tabIndex: -1, style: HIDDEN_STYLES }),
          );
        });
        function FloatingFocusManager(props) {
          const {
              context,
              children,
              disabled = !1,
              order = ['content'],
              guards: _guards = !0,
              initialFocus = 0,
              returnFocus = !0,
              modal = !0,
              visuallyHiddenDismiss = !1,
              closeOnFocusOut = !0,
            } = props,
            {
              open,
              refs,
              nodeId,
              onOpenChange,
              events,
              dataRef,
              elements: { domReference, floating },
            } = context,
            ignoreInitialFocus = 'number' == typeof initialFocus && initialFocus < 0,
            isUntrappedTypeableCombobox = isTypeableCombobox(domReference) && ignoreInitialFocus,
            guards = !supportsInert() || _guards,
            orderRef = useLatestRef(order),
            initialFocusRef = useLatestRef(initialFocus),
            returnFocusRef = useLatestRef(returnFocus),
            tree = useFloatingTree(),
            portalContext = usePortalContext(),
            startDismissButtonRef = react.useRef(null),
            endDismissButtonRef = react.useRef(null),
            preventReturnFocusRef = react.useRef(!1),
            isPointerDownRef = react.useRef(!1),
            isInsidePortal = null != portalContext,
            getTabbableContent = react.useCallback(
              function (container) {
                return (
                  void 0 === container && (container = floating),
                  container ? tabbable(container, getTabbableOptions()) : []
                );
              },
              [floating],
            ),
            getTabbableElements = react.useCallback(
              (container) => {
                const content = getTabbableContent(container);
                return orderRef.current
                  .map((type) =>
                    domReference && 'reference' === type
                      ? domReference
                      : floating && 'floating' === type
                        ? floating
                        : content,
                  )
                  .filter(Boolean)
                  .flat();
              },
              [domReference, floating, orderRef, getTabbableContent],
            );
          function renderDismissButton(location) {
            return !disabled && visuallyHiddenDismiss && modal
              ? react.createElement(
                  VisuallyHiddenDismiss,
                  {
                    ref: 'start' === location ? startDismissButtonRef : endDismissButtonRef,
                    onClick: (event) => onOpenChange(!1, event.nativeEvent),
                  },
                  'string' == typeof visuallyHiddenDismiss ? visuallyHiddenDismiss : 'Dismiss',
                )
              : null;
          }
          react.useEffect(() => {
            if (disabled || !modal) return;
            function onKeyDown(event) {
              if ('Tab' === event.key) {
                floating_ui_react_utils_contains(
                  floating,
                  activeElement(floating_ui_react_utils_getDocument(floating)),
                ) &&
                  0 === getTabbableContent().length &&
                  !isUntrappedTypeableCombobox &&
                  stopEvent(event);
                const els = getTabbableElements(),
                  target = getTarget(event);
                'reference' === orderRef.current[0] &&
                  target === domReference &&
                  (stopEvent(event),
                  event.shiftKey ? enqueueFocus(els[els.length - 1]) : enqueueFocus(els[1])),
                  'floating' === orderRef.current[1] &&
                    target === floating &&
                    event.shiftKey &&
                    (stopEvent(event), enqueueFocus(els[0]));
              }
            }
            const doc = floating_ui_react_utils_getDocument(floating);
            return (
              doc.addEventListener('keydown', onKeyDown),
              () => {
                doc.removeEventListener('keydown', onKeyDown);
              }
            );
          }, [
            disabled,
            domReference,
            floating,
            modal,
            orderRef,
            isUntrappedTypeableCombobox,
            getTabbableContent,
            getTabbableElements,
          ]),
            react.useEffect(() => {
              if (!disabled && closeOnFocusOut)
                return floating && (0, floating_ui_utils_dom.sb)(domReference)
                  ? (domReference.addEventListener('focusout', handleFocusOutside),
                    domReference.addEventListener('pointerdown', handlePointerDown),
                    !modal && floating.addEventListener('focusout', handleFocusOutside),
                    () => {
                      domReference.removeEventListener('focusout', handleFocusOutside),
                        domReference.removeEventListener('pointerdown', handlePointerDown),
                        !modal && floating.removeEventListener('focusout', handleFocusOutside);
                    })
                  : void 0;
              function handlePointerDown() {
                (isPointerDownRef.current = !0),
                  setTimeout(() => {
                    isPointerDownRef.current = !1;
                  });
              }
              function handleFocusOutside(event) {
                const relatedTarget = event.relatedTarget;
                queueMicrotask(() => {
                  const movedToUnrelatedNode = !(
                    floating_ui_react_utils_contains(domReference, relatedTarget) ||
                    floating_ui_react_utils_contains(floating, relatedTarget) ||
                    floating_ui_react_utils_contains(relatedTarget, floating) ||
                    floating_ui_react_utils_contains(
                      null == portalContext ? void 0 : portalContext.portalNode,
                      relatedTarget,
                    ) ||
                    (null != relatedTarget &&
                      relatedTarget.hasAttribute(createAttribute('focus-guard'))) ||
                    (tree &&
                      (getChildren(tree.nodesRef.current, nodeId).find((node) => {
                        var _node$context, _node$context2;
                        return (
                          floating_ui_react_utils_contains(
                            null == (_node$context = node.context)
                              ? void 0
                              : _node$context.elements.floating,
                            relatedTarget,
                          ) ||
                          floating_ui_react_utils_contains(
                            null == (_node$context2 = node.context)
                              ? void 0
                              : _node$context2.elements.domReference,
                            relatedTarget,
                          )
                        );
                      }) ||
                        (function getAncestors(nodes, id) {
                          var _nodes$find;
                          let allAncestors = [],
                            currentParentId =
                              null == (_nodes$find = nodes.find((node) => node.id === id))
                                ? void 0
                                : _nodes$find.parentId;
                          for (; currentParentId; ) {
                            const currentNode = nodes.find((node) => node.id === currentParentId);
                            (currentParentId = null == currentNode ? void 0 : currentNode.parentId),
                              currentNode && (allAncestors = allAncestors.concat(currentNode));
                          }
                          return allAncestors;
                        })(tree.nodesRef.current, nodeId).find((node) => {
                          var _node$context3, _node$context4;
                          return (
                            (null == (_node$context3 = node.context)
                              ? void 0
                              : _node$context3.elements.floating) === relatedTarget ||
                            (null == (_node$context4 = node.context)
                              ? void 0
                              : _node$context4.elements.domReference) === relatedTarget
                          );
                        })))
                  );
                  relatedTarget &&
                    movedToUnrelatedNode &&
                    !isPointerDownRef.current &&
                    relatedTarget !== getPreviouslyFocusedElement() &&
                    ((preventReturnFocusRef.current = !0), onOpenChange(!1, event));
                });
              }
            }, [
              disabled,
              domReference,
              floating,
              modal,
              nodeId,
              tree,
              portalContext,
              onOpenChange,
              closeOnFocusOut,
            ]),
            react.useEffect(() => {
              var _portalContext$portal;
              if (disabled) return;
              const portalNodes = Array.from(
                (null == portalContext || null == (_portalContext$portal = portalContext.portalNode)
                  ? void 0
                  : _portalContext$portal.querySelectorAll(
                      '[' + createAttribute('portal') + ']',
                    )) || [],
              );
              if (floating) {
                const insideElements = [
                    floating,
                    ...portalNodes,
                    startDismissButtonRef.current,
                    endDismissButtonRef.current,
                    orderRef.current.includes('reference') || isUntrappedTypeableCombobox
                      ? domReference
                      : null,
                  ].filter((x) => null != x),
                  cleanup =
                    modal || isUntrappedTypeableCombobox
                      ? markOthers(insideElements, guards, !guards)
                      : markOthers(insideElements);
                return () => {
                  cleanup();
                };
              }
            }, [
              disabled,
              domReference,
              floating,
              modal,
              orderRef,
              portalContext,
              isUntrappedTypeableCombobox,
              guards,
            ]),
            index(() => {
              if (disabled || !floating) return;
              const previouslyFocusedElement = activeElement(
                floating_ui_react_utils_getDocument(floating),
              );
              queueMicrotask(() => {
                const focusableElements = getTabbableElements(floating),
                  initialFocusValue = initialFocusRef.current,
                  elToFocus =
                    ('number' == typeof initialFocusValue
                      ? focusableElements[initialFocusValue]
                      : initialFocusValue.current) || floating,
                  focusAlreadyInsideFloatingEl = floating_ui_react_utils_contains(
                    floating,
                    previouslyFocusedElement,
                  );
                ignoreInitialFocus ||
                  focusAlreadyInsideFloatingEl ||
                  !open ||
                  enqueueFocus(elToFocus, { preventScroll: elToFocus === floating });
              });
            }, [
              disabled,
              open,
              floating,
              ignoreInitialFocus,
              getTabbableElements,
              initialFocusRef,
            ]),
            index(() => {
              if (disabled || !floating) return;
              let preventReturnFocusScroll = !1;
              const doc = floating_ui_react_utils_getDocument(floating),
                previouslyFocusedElement = activeElement(doc),
                contextData = dataRef.current;
              function onOpenChange(_ref) {
                let { reason, event, nested } = _ref;
                'escape-key' === reason &&
                  refs.domReference.current &&
                  addPreviouslyFocusedElement(refs.domReference.current),
                  'hover' === reason &&
                    'mouseleave' === event.type &&
                    (preventReturnFocusRef.current = !0),
                  'outside-press' === reason &&
                    (nested
                      ? ((preventReturnFocusRef.current = !1), (preventReturnFocusScroll = !0))
                      : (preventReturnFocusRef.current = !(
                          isVirtualClick(event) || isVirtualPointerEvent(event)
                        )));
              }
              return (
                addPreviouslyFocusedElement(previouslyFocusedElement),
                events.on('openchange', onOpenChange),
                () => {
                  events.off('openchange', onOpenChange);
                  const activeEl = activeElement(doc),
                    isFocusInsideFloatingTree =
                      floating_ui_react_utils_contains(floating, activeEl) ||
                      (tree &&
                        getChildren(tree.nodesRef.current, nodeId).some((node) => {
                          var _node$context5;
                          return floating_ui_react_utils_contains(
                            null == (_node$context5 = node.context)
                              ? void 0
                              : _node$context5.elements.floating,
                            activeEl,
                          );
                        }));
                  (isFocusInsideFloatingTree ||
                    (contextData.openEvent &&
                      ['click', 'mousedown'].includes(contextData.openEvent.type))) &&
                    refs.domReference.current &&
                    addPreviouslyFocusedElement(refs.domReference.current);
                  const returnElement = getPreviouslyFocusedElement();
                  returnFocusRef.current &&
                    !preventReturnFocusRef.current &&
                    (0, floating_ui_utils_dom.sb)(returnElement) &&
                    (returnElement === activeEl ||
                      activeEl === doc.body ||
                      isFocusInsideFloatingTree) &&
                    enqueueFocus(returnElement, {
                      cancelPrevious: !1,
                      preventScroll: preventReturnFocusScroll,
                    });
                }
              );
            }, [disabled, floating, returnFocusRef, dataRef, refs, events, tree, nodeId]),
            index(() => {
              if (!disabled && portalContext)
                return (
                  portalContext.setFocusManagerState({
                    modal,
                    closeOnFocusOut,
                    open,
                    onOpenChange,
                    refs,
                  }),
                  () => {
                    portalContext.setFocusManagerState(null);
                  }
                );
            }, [disabled, portalContext, modal, open, onOpenChange, refs, closeOnFocusOut]),
            index(() => {
              if (
                disabled ||
                !floating ||
                'function' != typeof MutationObserver ||
                ignoreInitialFocus
              )
                return;
              const handleMutation = () => {
                const tabIndex = floating.getAttribute('tabindex');
                orderRef.current.includes('floating') ||
                (activeElement(floating_ui_react_utils_getDocument(floating)) !==
                  refs.domReference.current &&
                  0 === getTabbableContent().length)
                  ? '0' !== tabIndex && floating.setAttribute('tabindex', '0')
                  : '-1' !== tabIndex && floating.setAttribute('tabindex', '-1');
              };
              handleMutation();
              const observer = new MutationObserver(handleMutation);
              return (
                observer.observe(floating, { childList: !0, subtree: !0, attributes: !0 }),
                () => {
                  observer.disconnect();
                }
              );
            }, [disabled, floating, refs, orderRef, getTabbableContent, ignoreInitialFocus]);
          const shouldRenderGuards = !disabled && guards && (isInsidePortal || modal);
          return react.createElement(
            react.Fragment,
            null,
            shouldRenderGuards &&
              react.createElement(FocusGuard, {
                'data-type': 'inside',
                ref: null == portalContext ? void 0 : portalContext.beforeInsideRef,
                onFocus: (event) => {
                  if (modal) {
                    const els = getTabbableElements();
                    enqueueFocus('reference' === order[0] ? els[0] : els[els.length - 1]);
                  } else if (
                    null != portalContext &&
                    portalContext.preserveTabOrder &&
                    portalContext.portalNode
                  )
                    if (
                      ((preventReturnFocusRef.current = !1),
                      isOutsideEvent(event, portalContext.portalNode))
                    ) {
                      const nextTabbable = getNextTabbable() || domReference;
                      null == nextTabbable || nextTabbable.focus();
                    } else {
                      var _portalContext$before;
                      null == (_portalContext$before = portalContext.beforeOutsideRef.current) ||
                        _portalContext$before.focus();
                    }
                },
              }),
            !isUntrappedTypeableCombobox && renderDismissButton('start'),
            children,
            renderDismissButton('end'),
            shouldRenderGuards &&
              react.createElement(FocusGuard, {
                'data-type': 'inside',
                ref: null == portalContext ? void 0 : portalContext.afterInsideRef,
                onFocus: (event) => {
                  if (modal) enqueueFocus(getTabbableElements()[0]);
                  else if (
                    null != portalContext &&
                    portalContext.preserveTabOrder &&
                    portalContext.portalNode
                  )
                    if (
                      (closeOnFocusOut && (preventReturnFocusRef.current = !0),
                      isOutsideEvent(event, portalContext.portalNode))
                    ) {
                      const prevTabbable = getPreviousTabbable() || domReference;
                      null == prevTabbable || prevTabbable.focus();
                    } else {
                      var _portalContext$afterO;
                      null == (_portalContext$afterO = portalContext.afterOutsideRef.current) ||
                        _portalContext$afterO.focus();
                    }
                },
              }),
          );
        }
        function isButtonTarget(event) {
          return (0, floating_ui_utils_dom.sb)(event.target) && 'BUTTON' === event.target.tagName;
        }
        function isSpaceIgnored(element) {
          return isTypeableElement(element);
        }
        function useClick(context, props) {
          void 0 === props && (props = {});
          const {
              open,
              onOpenChange,
              dataRef,
              elements: { domReference },
            } = context,
            {
              enabled = !0,
              event: eventOption = 'click',
              toggle = !0,
              ignoreMouse = !1,
              keyboardHandlers = !0,
            } = props,
            pointerTypeRef = react.useRef(),
            didKeyDownRef = react.useRef(!1);
          return react.useMemo(
            () =>
              enabled
                ? {
                    reference: {
                      onPointerDown(event) {
                        pointerTypeRef.current = event.pointerType;
                      },
                      onMouseDown(event) {
                        0 === event.button &&
                          ((floating_ui_react_utils_isMouseLikePointerType(
                            pointerTypeRef.current,
                            !0,
                          ) &&
                            ignoreMouse) ||
                            ('click' !== eventOption &&
                              (!open ||
                              !toggle ||
                              (dataRef.current.openEvent &&
                                'mousedown' !== dataRef.current.openEvent.type)
                                ? (event.preventDefault(),
                                  onOpenChange(!0, event.nativeEvent, 'click'))
                                : onOpenChange(!1, event.nativeEvent, 'click'))));
                      },
                      onClick(event) {
                        'mousedown' === eventOption && pointerTypeRef.current
                          ? (pointerTypeRef.current = void 0)
                          : (floating_ui_react_utils_isMouseLikePointerType(
                              pointerTypeRef.current,
                              !0,
                            ) &&
                              ignoreMouse) ||
                            (!open ||
                            !toggle ||
                            (dataRef.current.openEvent &&
                              'click' !== dataRef.current.openEvent.type)
                              ? onOpenChange(!0, event.nativeEvent, 'click')
                              : onOpenChange(!1, event.nativeEvent, 'click'));
                      },
                      onKeyDown(event) {
                        (pointerTypeRef.current = void 0),
                          event.defaultPrevented ||
                            !keyboardHandlers ||
                            isButtonTarget(event) ||
                            (' ' !== event.key ||
                              isSpaceIgnored(domReference) ||
                              (event.preventDefault(), (didKeyDownRef.current = !0)),
                            'Enter' === event.key &&
                              onOpenChange(!open || !toggle, event.nativeEvent, 'click'));
                      },
                      onKeyUp(event) {
                        event.defaultPrevented ||
                          !keyboardHandlers ||
                          isButtonTarget(event) ||
                          isSpaceIgnored(domReference) ||
                          (' ' === event.key &&
                            didKeyDownRef.current &&
                            ((didKeyDownRef.current = !1),
                            onOpenChange(!open || !toggle, event.nativeEvent, 'click')));
                      },
                    },
                  }
                : {},
            [
              enabled,
              dataRef,
              eventOption,
              ignoreMouse,
              keyboardHandlers,
              domReference,
              toggle,
              open,
              onOpenChange,
            ],
          );
        }
        const bubbleHandlerKeys = {
            pointerdown: 'onPointerDown',
            mousedown: 'onMouseDown',
            click: 'onClick',
          },
          captureHandlerKeys = {
            pointerdown: 'onPointerDownCapture',
            mousedown: 'onMouseDownCapture',
            click: 'onClickCapture',
          },
          normalizeProp = (normalizable) => {
            var _normalizable$escapeK, _normalizable$outside;
            return {
              escapeKey:
                'boolean' == typeof normalizable
                  ? normalizable
                  : null !=
                      (_normalizable$escapeK =
                        null == normalizable ? void 0 : normalizable.escapeKey) &&
                    _normalizable$escapeK,
              outsidePress:
                'boolean' == typeof normalizable
                  ? normalizable
                  : null ==
                      (_normalizable$outside =
                        null == normalizable ? void 0 : normalizable.outsidePress) ||
                    _normalizable$outside,
            };
          };
        function useDismiss(context, props) {
          void 0 === props && (props = {});
          const {
              open,
              onOpenChange,
              nodeId,
              elements: { reference, domReference, floating },
              dataRef,
            } = context,
            {
              enabled = !0,
              escapeKey = !0,
              outsidePress: unstable_outsidePress = !0,
              outsidePressEvent = 'pointerdown',
              referencePress = !1,
              referencePressEvent = 'pointerdown',
              ancestorScroll = !1,
              bubbles,
              capture,
            } = props,
            tree = useFloatingTree(),
            outsidePressFn = useEffectEvent(
              'function' == typeof unstable_outsidePress ? unstable_outsidePress : () => !1,
            ),
            outsidePress =
              'function' == typeof unstable_outsidePress ? outsidePressFn : unstable_outsidePress,
            insideReactTreeRef = react.useRef(!1),
            endedOrStartedInsideRef = react.useRef(!1),
            { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } =
              normalizeProp(bubbles),
            { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } =
              normalizeProp(capture),
            closeOnEscapeKeyDown = useEffectEvent((event) => {
              if (!open || !enabled || !escapeKey || 'Escape' !== event.key) return;
              const children = tree ? getChildren(tree.nodesRef.current, nodeId) : [];
              if (!escapeKeyBubbles && (event.stopPropagation(), children.length > 0)) {
                let shouldDismiss = !0;
                if (
                  (children.forEach((child) => {
                    var _child$context;
                    null == (_child$context = child.context) ||
                      !_child$context.open ||
                      child.context.dataRef.current.__escapeKeyBubbles ||
                      (shouldDismiss = !1);
                  }),
                  !shouldDismiss)
                )
                  return;
              }
              onOpenChange(
                !1,
                (function isReactEvent(event) {
                  return 'nativeEvent' in event;
                })(event)
                  ? event.nativeEvent
                  : event,
                'escape-key',
              );
            }),
            closeOnEscapeKeyDownCapture = useEffectEvent((event) => {
              var _getTarget2;
              const callback = () => {
                var _getTarget;
                closeOnEscapeKeyDown(event),
                  null == (_getTarget = getTarget(event)) ||
                    _getTarget.removeEventListener('keydown', callback);
              };
              null == (_getTarget2 = getTarget(event)) ||
                _getTarget2.addEventListener('keydown', callback);
            }),
            closeOnPressOutside = useEffectEvent((event) => {
              const insideReactTree = insideReactTreeRef.current;
              insideReactTreeRef.current = !1;
              const endedOrStartedInside = endedOrStartedInsideRef.current;
              if (
                ((endedOrStartedInsideRef.current = !1),
                'click' === outsidePressEvent && endedOrStartedInside)
              )
                return;
              if (insideReactTree) return;
              if ('function' == typeof outsidePress && !outsidePress(event)) return;
              const target = getTarget(event),
                inertSelector = '[' + createAttribute('inert') + ']',
                markers =
                  floating_ui_react_utils_getDocument(floating).querySelectorAll(inertSelector);
              let targetRootAncestor = (0, floating_ui_utils_dom.vq)(target) ? target : null;
              for (; targetRootAncestor && !(0, floating_ui_utils_dom.eu)(targetRootAncestor); ) {
                const nextParent = (0, floating_ui_utils_dom.$4)(targetRootAncestor);
                if (
                  (0, floating_ui_utils_dom.eu)(nextParent) ||
                  !(0, floating_ui_utils_dom.vq)(nextParent)
                )
                  break;
                targetRootAncestor = nextParent;
              }
              if (
                markers.length &&
                (0, floating_ui_utils_dom.vq)(target) &&
                !(function isRootElement(element) {
                  return element.matches('html,body');
                })(target) &&
                !floating_ui_react_utils_contains(target, floating) &&
                Array.from(markers).every(
                  (marker) => !floating_ui_react_utils_contains(targetRootAncestor, marker),
                )
              )
                return;
              if ((0, floating_ui_utils_dom.sb)(target) && floating) {
                const canScrollX =
                    target.clientWidth > 0 && target.scrollWidth > target.clientWidth,
                  canScrollY = target.clientHeight > 0 && target.scrollHeight > target.clientHeight;
                let xCond = canScrollY && event.offsetX > target.clientWidth;
                if (canScrollY) {
                  'rtl' === (0, floating_ui_utils_dom.L9)(target).direction &&
                    (xCond = event.offsetX <= target.offsetWidth - target.clientWidth);
                }
                if (xCond || (canScrollX && event.offsetY > target.clientHeight)) return;
              }
              const targetIsInsideChildren =
                tree &&
                getChildren(tree.nodesRef.current, nodeId).some((node) => {
                  var _node$context;
                  return isEventTargetWithin(
                    event,
                    null == (_node$context = node.context)
                      ? void 0
                      : _node$context.elements.floating,
                  );
                });
              if (
                isEventTargetWithin(event, floating) ||
                isEventTargetWithin(event, domReference) ||
                targetIsInsideChildren
              )
                return;
              const children = tree ? getChildren(tree.nodesRef.current, nodeId) : [];
              if (children.length > 0) {
                let shouldDismiss = !0;
                if (
                  (children.forEach((child) => {
                    var _child$context2;
                    null == (_child$context2 = child.context) ||
                      !_child$context2.open ||
                      child.context.dataRef.current.__outsidePressBubbles ||
                      (shouldDismiss = !1);
                  }),
                  !shouldDismiss)
                )
                  return;
              }
              onOpenChange(!1, event, 'outside-press');
            }),
            closeOnPressOutsideCapture = useEffectEvent((event) => {
              var _getTarget4;
              const callback = () => {
                var _getTarget3;
                closeOnPressOutside(event),
                  null == (_getTarget3 = getTarget(event)) ||
                    _getTarget3.removeEventListener(outsidePressEvent, callback);
              };
              null == (_getTarget4 = getTarget(event)) ||
                _getTarget4.addEventListener(outsidePressEvent, callback);
            });
          return (
            react.useEffect(() => {
              if (!open || !enabled) return;
              function onScroll(event) {
                onOpenChange(!1, event, 'ancestor-scroll');
              }
              (dataRef.current.__escapeKeyBubbles = escapeKeyBubbles),
                (dataRef.current.__outsidePressBubbles = outsidePressBubbles);
              const doc = floating_ui_react_utils_getDocument(floating);
              escapeKey &&
                doc.addEventListener(
                  'keydown',
                  escapeKeyCapture ? closeOnEscapeKeyDownCapture : closeOnEscapeKeyDown,
                  escapeKeyCapture,
                ),
                outsidePress &&
                  doc.addEventListener(
                    outsidePressEvent,
                    outsidePressCapture ? closeOnPressOutsideCapture : closeOnPressOutside,
                    outsidePressCapture,
                  );
              let ancestors = [];
              return (
                ancestorScroll &&
                  ((0, floating_ui_utils_dom.vq)(domReference) &&
                    (ancestors = (0, floating_ui_utils_dom.v9)(domReference)),
                  (0, floating_ui_utils_dom.vq)(floating) &&
                    (ancestors = ancestors.concat((0, floating_ui_utils_dom.v9)(floating))),
                  !(0, floating_ui_utils_dom.vq)(reference) &&
                    reference &&
                    reference.contextElement &&
                    (ancestors = ancestors.concat(
                      (0, floating_ui_utils_dom.v9)(reference.contextElement),
                    ))),
                (ancestors = ancestors.filter((ancestor) => {
                  var _doc$defaultView;
                  return (
                    ancestor !==
                    (null == (_doc$defaultView = doc.defaultView)
                      ? void 0
                      : _doc$defaultView.visualViewport)
                  );
                })),
                ancestors.forEach((ancestor) => {
                  ancestor.addEventListener('scroll', onScroll, { passive: !0 });
                }),
                () => {
                  escapeKey &&
                    doc.removeEventListener(
                      'keydown',
                      escapeKeyCapture ? closeOnEscapeKeyDownCapture : closeOnEscapeKeyDown,
                      escapeKeyCapture,
                    ),
                    outsidePress &&
                      doc.removeEventListener(
                        outsidePressEvent,
                        outsidePressCapture ? closeOnPressOutsideCapture : closeOnPressOutside,
                        outsidePressCapture,
                      ),
                    ancestors.forEach((ancestor) => {
                      ancestor.removeEventListener('scroll', onScroll);
                    });
                }
              );
            }, [
              dataRef,
              floating,
              domReference,
              reference,
              escapeKey,
              outsidePress,
              outsidePressEvent,
              open,
              onOpenChange,
              ancestorScroll,
              enabled,
              escapeKeyBubbles,
              outsidePressBubbles,
              closeOnEscapeKeyDown,
              escapeKeyCapture,
              closeOnEscapeKeyDownCapture,
              closeOnPressOutside,
              outsidePressCapture,
              closeOnPressOutsideCapture,
            ]),
            react.useEffect(() => {
              insideReactTreeRef.current = !1;
            }, [outsidePress, outsidePressEvent]),
            react.useMemo(
              () =>
                enabled
                  ? {
                      reference: {
                        onKeyDown: closeOnEscapeKeyDown,
                        [bubbleHandlerKeys[referencePressEvent]]: (event) => {
                          referencePress && onOpenChange(!1, event.nativeEvent, 'reference-press');
                        },
                      },
                      floating: {
                        onKeyDown: closeOnEscapeKeyDown,
                        onMouseDown() {
                          endedOrStartedInsideRef.current = !0;
                        },
                        onMouseUp() {
                          endedOrStartedInsideRef.current = !0;
                        },
                        [captureHandlerKeys[outsidePressEvent]]: () => {
                          insideReactTreeRef.current = !0;
                        },
                      },
                    }
                  : {},
              [
                enabled,
                referencePress,
                outsidePressEvent,
                referencePressEvent,
                onOpenChange,
                closeOnEscapeKeyDown,
              ],
            )
          );
        }
        function useFloating(options) {
          var _options$elements;
          void 0 === options && (options = {});
          const { open = !1, onOpenChange: unstable_onOpenChange, nodeId } = options,
            [_domReference, setDomReference] = react.useState(null),
            [positionReference, _setPositionReference] = react.useState(null),
            domReference =
              (null == (_options$elements = options.elements)
                ? void 0
                : _options$elements.reference) || _domReference;
          index(() => {
            domReference && (domReferenceRef.current = domReference);
          }, [domReference]);
          const position = (0, floating_ui_react_dom.we)({
              ...options,
              elements: {
                ...options.elements,
                ...(positionReference && { reference: positionReference }),
              },
            }),
            tree = useFloatingTree(),
            nested = null != useFloatingParentNodeId(),
            onOpenChange = useEffectEvent((open, event, reason) => {
              (dataRef.current.openEvent = open ? event : void 0),
                events.emit('openchange', { open, event, reason, nested }),
                null == unstable_onOpenChange || unstable_onOpenChange(open, event, reason);
            }),
            domReferenceRef = react.useRef(null),
            dataRef = react.useRef({}),
            events = react.useState(() =>
              (function createPubSub() {
                const map = new Map();
                return {
                  emit(event, data) {
                    var _map$get;
                    null == (_map$get = map.get(event)) ||
                      _map$get.forEach((handler) => handler(data));
                  },
                  on(event, listener) {
                    map.set(event, [...(map.get(event) || []), listener]);
                  },
                  off(event, listener) {
                    var _map$get2;
                    map.set(
                      event,
                      (null == (_map$get2 = map.get(event))
                        ? void 0
                        : _map$get2.filter((l) => l !== listener)) || [],
                    );
                  },
                };
              })(),
            )[0],
            floatingId = useId(),
            setPositionReference = react.useCallback(
              (node) => {
                const computedPositionReference = (0, floating_ui_utils_dom.vq)(node)
                  ? {
                      getBoundingClientRect: () => node.getBoundingClientRect(),
                      contextElement: node,
                    }
                  : node;
                _setPositionReference(computedPositionReference),
                  position.refs.setReference(computedPositionReference);
              },
              [position.refs],
            ),
            setReference = react.useCallback(
              (node) => {
                ((0, floating_ui_utils_dom.vq)(node) || null === node) &&
                  ((domReferenceRef.current = node), setDomReference(node)),
                  ((0, floating_ui_utils_dom.vq)(position.refs.reference.current) ||
                    null === position.refs.reference.current ||
                    (null !== node && !(0, floating_ui_utils_dom.vq)(node))) &&
                    position.refs.setReference(node);
              },
              [position.refs],
            ),
            refs = react.useMemo(
              () => ({
                ...position.refs,
                setReference,
                setPositionReference,
                domReference: domReferenceRef,
              }),
              [position.refs, setReference, setPositionReference],
            ),
            elements = react.useMemo(
              () => ({ ...position.elements, domReference }),
              [position.elements, domReference],
            ),
            context = react.useMemo(
              () => ({
                ...position,
                refs,
                elements,
                dataRef,
                nodeId,
                floatingId,
                events,
                open,
                onOpenChange,
              }),
              [position, nodeId, floatingId, events, open, onOpenChange, refs, elements],
            );
          return (
            index(() => {
              const node =
                null == tree ? void 0 : tree.nodesRef.current.find((node) => node.id === nodeId);
              node && (node.context = context);
            }),
            react.useMemo(
              () => ({ ...position, context, refs, elements }),
              [position, refs, elements, context],
            )
          );
        }
        function useFocus(context, props) {
          void 0 === props && (props = {});
          const {
              open,
              onOpenChange,
              events,
              refs,
              elements: { domReference },
            } = context,
            { enabled = !0, visibleOnly = !0 } = props,
            blockFocusRef = react.useRef(!1),
            timeoutRef = react.useRef(),
            keyboardModalityRef = react.useRef(!0);
          return (
            react.useEffect(() => {
              if (!enabled) return;
              const win = (0, floating_ui_utils_dom.zk)(domReference);
              function onBlur() {
                !open &&
                  (0, floating_ui_utils_dom.sb)(domReference) &&
                  domReference ===
                    activeElement(floating_ui_react_utils_getDocument(domReference)) &&
                  (blockFocusRef.current = !0);
              }
              function onKeyDown() {
                keyboardModalityRef.current = !0;
              }
              return (
                win.addEventListener('blur', onBlur),
                win.addEventListener('keydown', onKeyDown, !0),
                () => {
                  win.removeEventListener('blur', onBlur),
                    win.removeEventListener('keydown', onKeyDown, !0);
                }
              );
            }, [domReference, open, enabled]),
            react.useEffect(() => {
              if (enabled)
                return (
                  events.on('openchange', onOpenChange),
                  () => {
                    events.off('openchange', onOpenChange);
                  }
                );
              function onOpenChange(_ref) {
                let { reason } = _ref;
                ('reference-press' !== reason && 'escape-key' !== reason) ||
                  (blockFocusRef.current = !0);
              }
            }, [events, enabled]),
            react.useEffect(
              () => () => {
                clearTimeout(timeoutRef.current);
              },
              [],
            ),
            react.useMemo(
              () =>
                enabled
                  ? {
                      reference: {
                        onPointerDown(event) {
                          isVirtualPointerEvent(event.nativeEvent) ||
                            (keyboardModalityRef.current = !1);
                        },
                        onMouseLeave() {
                          blockFocusRef.current = !1;
                        },
                        onFocus(event) {
                          if (blockFocusRef.current) return;
                          const target = getTarget(event.nativeEvent);
                          if (visibleOnly && (0, floating_ui_utils_dom.vq)(target))
                            try {
                              if (isSafari() && isMac()) throw Error();
                              if (!target.matches(':focus-visible')) return;
                            } catch (e) {
                              if (!keyboardModalityRef.current && !isTypeableElement(target))
                                return;
                            }
                          onOpenChange(!0, event.nativeEvent, 'focus');
                        },
                        onBlur(event) {
                          blockFocusRef.current = !1;
                          const relatedTarget = event.relatedTarget,
                            movedToFocusGuard =
                              (0, floating_ui_utils_dom.vq)(relatedTarget) &&
                              relatedTarget.hasAttribute(createAttribute('focus-guard')) &&
                              'outside' === relatedTarget.getAttribute('data-type');
                          timeoutRef.current = window.setTimeout(() => {
                            const activeEl = activeElement(
                              domReference ? domReference.ownerDocument : document,
                            );
                            (relatedTarget || activeEl !== domReference) &&
                              (floating_ui_react_utils_contains(refs.floating.current, activeEl) ||
                                floating_ui_react_utils_contains(domReference, activeEl) ||
                                movedToFocusGuard ||
                                onOpenChange(!1, event.nativeEvent, 'focus'));
                          });
                        },
                      },
                    }
                  : {},
              [enabled, visibleOnly, domReference, refs, onOpenChange],
            )
          );
        }
        const ACTIVE_KEY = 'active',
          SELECTED_KEY = 'selected';
        function mergeProps(userProps, propsList, elementKey) {
          const map = new Map(),
            isItem = 'item' === elementKey;
          let domUserProps = userProps;
          if (isItem && userProps) {
            const { [ACTIVE_KEY]: _, [SELECTED_KEY]: __, ...validProps } = userProps;
            domUserProps = validProps;
          }
          return {
            ...('floating' === elementKey && { tabIndex: -1 }),
            ...domUserProps,
            ...propsList
              .map((value) => {
                const propsOrGetProps = value ? value[elementKey] : null;
                return 'function' == typeof propsOrGetProps
                  ? userProps
                    ? propsOrGetProps(userProps)
                    : null
                  : propsOrGetProps;
              })
              .concat(userProps)
              .reduce(
                (acc, props) =>
                  props
                    ? (Object.entries(props).forEach((_ref) => {
                        let [key, value] = _ref;
                        var _map$get;
                        (isItem && [ACTIVE_KEY, SELECTED_KEY].includes(key)) ||
                          (0 === key.indexOf('on')
                            ? (map.has(key) || map.set(key, []),
                              'function' == typeof value &&
                                (null == (_map$get = map.get(key)) || _map$get.push(value),
                                (acc[key] = function () {
                                  for (
                                    var _map$get2,
                                      _len = arguments.length,
                                      args = new Array(_len),
                                      _key = 0;
                                    _key < _len;
                                    _key++
                                  )
                                    args[_key] = arguments[_key];
                                  return null == (_map$get2 = map.get(key))
                                    ? void 0
                                    : _map$get2
                                        .map((fn) => fn(...args))
                                        .find((val) => void 0 !== val);
                                })))
                            : (acc[key] = value));
                      }),
                      acc)
                    : acc,
                {},
              ),
          };
        }
        function useInteractions(propsList) {
          void 0 === propsList && (propsList = []);
          const deps = propsList,
            getReferenceProps = react.useCallback(
              (userProps) => mergeProps(userProps, propsList, 'reference'),
              deps,
            ),
            getFloatingProps = react.useCallback(
              (userProps) => mergeProps(userProps, propsList, 'floating'),
              deps,
            ),
            getItemProps = react.useCallback(
              (userProps) => mergeProps(userProps, propsList, 'item'),
              propsList.map((key) => (null == key ? void 0 : key.item)),
            );
          return react.useMemo(
            () => ({ getReferenceProps, getFloatingProps, getItemProps }),
            [getReferenceProps, getFloatingProps, getItemProps],
          );
        }
        let isPreventScrollSupported = !1;
        function doSwitch(orientation, vertical, horizontal) {
          switch (orientation) {
            case 'vertical':
              return vertical;
            case 'horizontal':
              return horizontal;
            default:
              return vertical || horizontal;
          }
        }
        function isMainOrientationKey(key, orientation) {
          return doSwitch(
            orientation,
            key === ARROW_UP || key === ARROW_DOWN,
            key === ARROW_LEFT || key === ARROW_RIGHT,
          );
        }
        function isMainOrientationToEndKey(key, orientation, rtl) {
          return (
            doSwitch(
              orientation,
              key === ARROW_DOWN,
              rtl ? key === ARROW_LEFT : key === ARROW_RIGHT,
            ) ||
            'Enter' === key ||
            ' ' === key ||
            '' === key
          );
        }
        function isCrossOrientationCloseKey(key, orientation, rtl) {
          return doSwitch(
            orientation,
            rtl ? key === ARROW_RIGHT : key === ARROW_LEFT,
            key === ARROW_UP,
          );
        }
        function useListNavigation(context, props) {
          const {
              open,
              onOpenChange,
              refs,
              elements: { domReference, floating },
            } = context,
            {
              listRef,
              activeIndex,
              onNavigate: unstable_onNavigate = () => {},
              enabled = !0,
              selectedIndex = null,
              allowEscape = !1,
              loop = !1,
              nested = !1,
              rtl = !1,
              virtual = !1,
              focusItemOnOpen = 'auto',
              focusItemOnHover = !0,
              openOnArrowKeyDown = !0,
              disabledIndices,
              orientation = 'vertical',
              cols = 1,
              scrollItemIntoView = !0,
              virtualItemRef,
              itemSizes,
              dense = !1,
            } = props;
          const parentId = useFloatingParentNodeId(),
            tree = useFloatingTree(),
            onNavigate = useEffectEvent(unstable_onNavigate),
            focusItemOnOpenRef = react.useRef(focusItemOnOpen),
            indexRef = react.useRef(null != selectedIndex ? selectedIndex : -1),
            keyRef = react.useRef(null),
            isPointerModalityRef = react.useRef(!0),
            previousOnNavigateRef = react.useRef(onNavigate),
            previousMountedRef = react.useRef(!!floating),
            forceSyncFocus = react.useRef(!1),
            forceScrollIntoViewRef = react.useRef(!1),
            disabledIndicesRef = useLatestRef(disabledIndices),
            latestOpenRef = useLatestRef(open),
            scrollItemIntoViewRef = useLatestRef(scrollItemIntoView),
            [activeId, setActiveId] = react.useState(),
            [virtualId, setVirtualId] = react.useState(),
            focusItem = useEffectEvent(function (listRef, indexRef, forceScrollIntoView) {
              void 0 === forceScrollIntoView && (forceScrollIntoView = !1);
              const item = listRef.current[indexRef.current];
              item &&
                (virtual
                  ? (setActiveId(item.id),
                    null == tree || tree.events.emit('virtualfocus', item),
                    virtualItemRef && (virtualItemRef.current = item))
                  : enqueueFocus(item, {
                      preventScroll: !0,
                      sync:
                        !(!isMac() || !isSafari()) &&
                        (isPreventScrollSupported || forceSyncFocus.current),
                    }),
                requestAnimationFrame(() => {
                  const scrollIntoViewOptions = scrollItemIntoViewRef.current;
                  scrollIntoViewOptions &&
                    item &&
                    (forceScrollIntoView || !isPointerModalityRef.current) &&
                    (null == item.scrollIntoView ||
                      item.scrollIntoView(
                        'boolean' == typeof scrollIntoViewOptions
                          ? { block: 'nearest', inline: 'nearest' }
                          : scrollIntoViewOptions,
                      ));
                }));
            });
          index(() => {
            document.createElement('div').focus({
              get preventScroll() {
                return (isPreventScrollSupported = !0), !1;
              },
            });
          }, []),
            index(() => {
              enabled &&
                (open && floating
                  ? focusItemOnOpenRef.current &&
                    null != selectedIndex &&
                    ((forceScrollIntoViewRef.current = !0),
                    (indexRef.current = selectedIndex),
                    onNavigate(selectedIndex))
                  : previousMountedRef.current &&
                    ((indexRef.current = -1), previousOnNavigateRef.current(null)));
            }, [enabled, open, floating, selectedIndex, onNavigate]),
            index(() => {
              if (enabled && open && floating)
                if (null == activeIndex) {
                  if (((forceSyncFocus.current = !1), null != selectedIndex)) return;
                  if (
                    (previousMountedRef.current &&
                      ((indexRef.current = -1), focusItem(listRef, indexRef)),
                    !previousMountedRef.current &&
                      focusItemOnOpenRef.current &&
                      (null != keyRef.current ||
                        (!0 === focusItemOnOpenRef.current && null == keyRef.current)))
                  ) {
                    let runs = 0;
                    const waitForListPopulated = () => {
                      if (null == listRef.current[0]) {
                        if (runs < 2) {
                          (runs ? requestAnimationFrame : queueMicrotask)(waitForListPopulated);
                        }
                        runs++;
                      } else
                        (indexRef.current =
                          null == keyRef.current ||
                          isMainOrientationToEndKey(keyRef.current, orientation, rtl) ||
                          nested
                            ? getMinIndex(listRef, disabledIndicesRef.current)
                            : getMaxIndex(listRef, disabledIndicesRef.current)),
                          (keyRef.current = null),
                          onNavigate(indexRef.current);
                    };
                    waitForListPopulated();
                  }
                } else
                  isIndexOutOfBounds(listRef, activeIndex) ||
                    ((indexRef.current = activeIndex),
                    focusItem(listRef, indexRef, forceScrollIntoViewRef.current),
                    (forceScrollIntoViewRef.current = !1));
            }, [
              enabled,
              open,
              floating,
              activeIndex,
              selectedIndex,
              nested,
              listRef,
              orientation,
              rtl,
              onNavigate,
              focusItem,
              disabledIndicesRef,
            ]),
            index(() => {
              var _nodes$find;
              if (!enabled || floating || !tree || virtual || !previousMountedRef.current) return;
              const nodes = tree.nodesRef.current,
                parent =
                  null == (_nodes$find = nodes.find((node) => node.id === parentId)) ||
                  null == (_nodes$find = _nodes$find.context)
                    ? void 0
                    : _nodes$find.elements.floating,
                activeEl = activeElement(floating_ui_react_utils_getDocument(floating)),
                treeContainsActiveEl = nodes.some(
                  (node) =>
                    node.context &&
                    floating_ui_react_utils_contains(node.context.elements.floating, activeEl),
                );
              parent &&
                !treeContainsActiveEl &&
                isPointerModalityRef.current &&
                parent.focus({ preventScroll: !0 });
            }, [enabled, floating, tree, parentId, virtual]),
            index(() => {
              if (enabled && tree && virtual && !parentId)
                return (
                  tree.events.on('virtualfocus', handleVirtualFocus),
                  () => {
                    tree.events.off('virtualfocus', handleVirtualFocus);
                  }
                );
              function handleVirtualFocus(item) {
                setVirtualId(item.id), virtualItemRef && (virtualItemRef.current = item);
              }
            }, [enabled, tree, virtual, parentId, virtualItemRef]),
            index(() => {
              (previousOnNavigateRef.current = onNavigate),
                (previousMountedRef.current = !!floating);
            }),
            index(() => {
              open || (keyRef.current = null);
            }, [open]);
          const hasActiveIndex = null != activeIndex,
            item = react.useMemo(() => {
              function syncCurrentTarget(currentTarget) {
                if (!open) return;
                const index = listRef.current.indexOf(currentTarget);
                -1 !== index && onNavigate(index);
              }
              return {
                onFocus(_ref) {
                  let { currentTarget } = _ref;
                  syncCurrentTarget(currentTarget);
                },
                onClick: (_ref2) => {
                  let { currentTarget } = _ref2;
                  return currentTarget.focus({ preventScroll: !0 });
                },
                ...(focusItemOnHover && {
                  onMouseMove(_ref3) {
                    let { currentTarget } = _ref3;
                    syncCurrentTarget(currentTarget);
                  },
                  onPointerLeave(_ref4) {
                    let { pointerType } = _ref4;
                    isPointerModalityRef.current &&
                      'touch' !== pointerType &&
                      ((indexRef.current = -1),
                      focusItem(listRef, indexRef),
                      onNavigate(null),
                      virtual || enqueueFocus(refs.floating.current, { preventScroll: !0 }));
                  },
                }),
              };
            }, [open, refs, focusItem, focusItemOnHover, listRef, onNavigate, virtual]);
          return react.useMemo(() => {
            if (!enabled) return {};
            const disabledIndices = disabledIndicesRef.current;
            function onKeyDown(event) {
              if (
                ((isPointerModalityRef.current = !1),
                (forceSyncFocus.current = !0),
                !latestOpenRef.current && event.currentTarget === refs.floating.current)
              )
                return;
              if (nested && isCrossOrientationCloseKey(event.key, orientation, rtl))
                return (
                  stopEvent(event),
                  onOpenChange(!1, event.nativeEvent, 'list-navigation'),
                  void (
                    (0, floating_ui_utils_dom.sb)(domReference) &&
                    !virtual &&
                    domReference.focus()
                  )
                );
              const currentIndex = indexRef.current,
                minIndex = getMinIndex(listRef, disabledIndices),
                maxIndex = getMaxIndex(listRef, disabledIndices);
              if (
                ('Home' === event.key &&
                  (stopEvent(event), (indexRef.current = minIndex), onNavigate(indexRef.current)),
                'End' === event.key &&
                  (stopEvent(event), (indexRef.current = maxIndex), onNavigate(indexRef.current)),
                cols > 1)
              ) {
                const sizes =
                    itemSizes ||
                    Array.from({ length: listRef.current.length }, () => ({ width: 1, height: 1 })),
                  cellMap = (function buildCellMap(sizes, cols, dense) {
                    const cellMap = [];
                    let startIndex = 0;
                    return (
                      sizes.forEach((_ref2, index) => {
                        let { width, height } = _ref2,
                          itemPlaced = !1;
                        for (dense && (startIndex = 0); !itemPlaced; ) {
                          const targetCells = [];
                          for (let i = 0; i < width; i++)
                            for (let j = 0; j < height; j++)
                              targetCells.push(startIndex + i + j * cols);
                          (startIndex % cols) + width <= cols &&
                          targetCells.every((cell) => null == cellMap[cell])
                            ? (targetCells.forEach((cell) => {
                                cellMap[cell] = index;
                              }),
                              (itemPlaced = !0))
                            : startIndex++;
                        }
                      }),
                      [...cellMap]
                    );
                  })(sizes, cols, dense),
                  minGridIndex = cellMap.findIndex(
                    (index) =>
                      null != index &&
                      !(null != disabledIndices && disabledIndices.includes(index)),
                  ),
                  maxGridIndex = cellMap.reduce(
                    (foundIndex, index, cellIndex) =>
                      null == index || (null != disabledIndices && disabledIndices.includes(index))
                        ? foundIndex
                        : cellIndex,
                    -1,
                  );
                if (
                  ((indexRef.current =
                    cellMap[
                      (function getGridNavigatedIndex(elementsRef, _ref) {
                        let {
                            event,
                            orientation,
                            loop,
                            cols,
                            disabledIndices,
                            minIndex,
                            maxIndex,
                            prevIndex,
                            stopEvent: stop = !1,
                          } = _ref,
                          nextIndex = prevIndex;
                        if (event.key === ARROW_UP) {
                          if ((stop && stopEvent(event), -1 === prevIndex)) nextIndex = maxIndex;
                          else if (
                            ((nextIndex = findNonDisabledIndex(elementsRef, {
                              startingIndex: nextIndex,
                              amount: cols,
                              decrement: !0,
                              disabledIndices,
                            })),
                            loop && (prevIndex - cols < minIndex || nextIndex < 0))
                          ) {
                            const col = prevIndex % cols,
                              maxCol = maxIndex % cols,
                              offset = maxIndex - (maxCol - col);
                            nextIndex =
                              maxCol === col ? maxIndex : maxCol > col ? offset : offset - cols;
                          }
                          isIndexOutOfBounds(elementsRef, nextIndex) && (nextIndex = prevIndex);
                        }
                        if (
                          (event.key === ARROW_DOWN &&
                            (stop && stopEvent(event),
                            -1 === prevIndex
                              ? (nextIndex = minIndex)
                              : ((nextIndex = findNonDisabledIndex(elementsRef, {
                                  startingIndex: prevIndex,
                                  amount: cols,
                                  disabledIndices,
                                })),
                                loop &&
                                  prevIndex + cols > maxIndex &&
                                  (nextIndex = findNonDisabledIndex(elementsRef, {
                                    startingIndex: (prevIndex % cols) - cols,
                                    amount: cols,
                                    disabledIndices,
                                  }))),
                            isIndexOutOfBounds(elementsRef, nextIndex) && (nextIndex = prevIndex)),
                          'both' === orientation)
                        ) {
                          const prevRow = (0, floating_ui_utils.RI)(prevIndex / cols);
                          event.key === ARROW_RIGHT &&
                            (stop && stopEvent(event),
                            prevIndex % cols != cols - 1
                              ? ((nextIndex = findNonDisabledIndex(elementsRef, {
                                  startingIndex: prevIndex,
                                  disabledIndices,
                                })),
                                loop &&
                                  isDifferentRow(nextIndex, cols, prevRow) &&
                                  (nextIndex = findNonDisabledIndex(elementsRef, {
                                    startingIndex: prevIndex - (prevIndex % cols) - 1,
                                    disabledIndices,
                                  })))
                              : loop &&
                                (nextIndex = findNonDisabledIndex(elementsRef, {
                                  startingIndex: prevIndex - (prevIndex % cols) - 1,
                                  disabledIndices,
                                })),
                            isDifferentRow(nextIndex, cols, prevRow) && (nextIndex = prevIndex)),
                            event.key === ARROW_LEFT &&
                              (stop && stopEvent(event),
                              prevIndex % cols != 0
                                ? ((nextIndex = findNonDisabledIndex(elementsRef, {
                                    startingIndex: prevIndex,
                                    disabledIndices,
                                    decrement: !0,
                                  })),
                                  loop &&
                                    isDifferentRow(nextIndex, cols, prevRow) &&
                                    (nextIndex = findNonDisabledIndex(elementsRef, {
                                      startingIndex: prevIndex + (cols - (prevIndex % cols)),
                                      decrement: !0,
                                      disabledIndices,
                                    })))
                                : loop &&
                                  (nextIndex = findNonDisabledIndex(elementsRef, {
                                    startingIndex: prevIndex + (cols - (prevIndex % cols)),
                                    decrement: !0,
                                    disabledIndices,
                                  })),
                              isDifferentRow(nextIndex, cols, prevRow) && (nextIndex = prevIndex));
                          const lastRow = (0, floating_ui_utils.RI)(maxIndex / cols) === prevRow;
                          isIndexOutOfBounds(elementsRef, nextIndex) &&
                            (nextIndex =
                              loop && lastRow
                                ? event.key === ARROW_LEFT
                                  ? maxIndex
                                  : findNonDisabledIndex(elementsRef, {
                                      startingIndex: prevIndex - (prevIndex % cols) - 1,
                                      disabledIndices,
                                    })
                                : prevIndex);
                        }
                        return nextIndex;
                      })(
                        {
                          current: cellMap.map((itemIndex) =>
                            null != itemIndex ? listRef.current[itemIndex] : null,
                          ),
                        },
                        {
                          event,
                          orientation,
                          loop,
                          cols,
                          disabledIndices: getCellIndices(
                            [...(disabledIndices || []), void 0],
                            cellMap,
                          ),
                          minIndex: minGridIndex,
                          maxIndex: maxGridIndex,
                          prevIndex: getCellIndexOfCorner(
                            indexRef.current,
                            sizes,
                            cellMap,
                            cols,
                            event.key === ARROW_DOWN
                              ? 'bl'
                              : event.key === ARROW_RIGHT
                                ? 'tr'
                                : 'tl',
                          ),
                          stopEvent: !0,
                        },
                      )
                    ]),
                  onNavigate(indexRef.current),
                  'both' === orientation)
                )
                  return;
              }
              if (isMainOrientationKey(event.key, orientation)) {
                if (
                  (stopEvent(event),
                  open &&
                    !virtual &&
                    activeElement(event.currentTarget.ownerDocument) === event.currentTarget)
                )
                  return (
                    (indexRef.current = isMainOrientationToEndKey(event.key, orientation, rtl)
                      ? minIndex
                      : maxIndex),
                    void onNavigate(indexRef.current)
                  );
                isMainOrientationToEndKey(event.key, orientation, rtl)
                  ? (indexRef.current = loop
                      ? currentIndex >= maxIndex
                        ? allowEscape && currentIndex !== listRef.current.length
                          ? -1
                          : minIndex
                        : findNonDisabledIndex(listRef, {
                            startingIndex: currentIndex,
                            disabledIndices,
                          })
                      : Math.min(
                          maxIndex,
                          findNonDisabledIndex(listRef, {
                            startingIndex: currentIndex,
                            disabledIndices,
                          }),
                        ))
                  : (indexRef.current = loop
                      ? currentIndex <= minIndex
                        ? allowEscape && -1 !== currentIndex
                          ? listRef.current.length
                          : maxIndex
                        : findNonDisabledIndex(listRef, {
                            startingIndex: currentIndex,
                            decrement: !0,
                            disabledIndices,
                          })
                      : Math.max(
                          minIndex,
                          findNonDisabledIndex(listRef, {
                            startingIndex: currentIndex,
                            decrement: !0,
                            disabledIndices,
                          }),
                        )),
                  isIndexOutOfBounds(listRef, indexRef.current)
                    ? onNavigate(null)
                    : onNavigate(indexRef.current);
              }
            }
            function checkVirtualMouse(event) {
              'auto' === focusItemOnOpen &&
                isVirtualClick(event.nativeEvent) &&
                (focusItemOnOpenRef.current = !0);
            }
            const ariaActiveDescendantProp = virtual &&
                open &&
                hasActiveIndex && { 'aria-activedescendant': virtualId || activeId },
              activeItem = listRef.current.find(
                (item) => (null == item ? void 0 : item.id) === activeId,
              );
            return {
              reference: {
                ...ariaActiveDescendantProp,
                onKeyDown(event) {
                  isPointerModalityRef.current = !1;
                  const isArrowKey = 0 === event.key.indexOf('Arrow'),
                    isCrossOpenKey = (function isCrossOrientationOpenKey(key, orientation, rtl) {
                      return doSwitch(
                        orientation,
                        rtl ? key === ARROW_LEFT : key === ARROW_RIGHT,
                        key === ARROW_DOWN,
                      );
                    })(event.key, orientation, rtl),
                    isCrossCloseKey = isCrossOrientationCloseKey(event.key, orientation, rtl),
                    isMainKey = isMainOrientationKey(event.key, orientation),
                    isNavigationKey =
                      (nested ? isCrossOpenKey : isMainKey) ||
                      'Enter' === event.key ||
                      '' === event.key.trim();
                  if (virtual && open) {
                    const rootNode =
                        null == tree
                          ? void 0
                          : tree.nodesRef.current.find((node) => null == node.parentId),
                      deepestNode =
                        tree && rootNode
                          ? (function getDeepestNode(nodes, id) {
                              let deepestNodeId,
                                maxDepth = -1;
                              return (
                                (function findDeepest(nodeId, depth) {
                                  depth > maxDepth &&
                                    ((deepestNodeId = nodeId), (maxDepth = depth)),
                                    getChildren(nodes, nodeId).forEach((child) => {
                                      findDeepest(child.id, depth + 1);
                                    });
                                })(id, 0),
                                nodes.find((node) => node.id === deepestNodeId)
                              );
                            })(tree.nodesRef.current, rootNode.id)
                          : null;
                    if (isArrowKey && deepestNode && virtualItemRef) {
                      const eventObject = new KeyboardEvent('keydown', {
                        key: event.key,
                        bubbles: !0,
                      });
                      if (isCrossOpenKey || isCrossCloseKey) {
                        var _deepestNode$context, _deepestNode$context2;
                        const isCurrentTarget =
                            (null == (_deepestNode$context = deepestNode.context)
                              ? void 0
                              : _deepestNode$context.elements.domReference) === event.currentTarget,
                          dispatchItem =
                            isCrossCloseKey && !isCurrentTarget
                              ? null == (_deepestNode$context2 = deepestNode.context)
                                ? void 0
                                : _deepestNode$context2.elements.domReference
                              : isCrossOpenKey
                                ? activeItem
                                : null;
                        dispatchItem &&
                          (stopEvent(event),
                          dispatchItem.dispatchEvent(eventObject),
                          setVirtualId(void 0));
                      }
                      var _deepestNode$context$;
                      if (isMainKey && deepestNode.context)
                        if (
                          deepestNode.context.open &&
                          deepestNode.parentId &&
                          event.currentTarget !== deepestNode.context.elements.domReference
                        )
                          return (
                            stopEvent(event),
                            void (
                              null ==
                                (_deepestNode$context$ =
                                  deepestNode.context.elements.domReference) ||
                              _deepestNode$context$.dispatchEvent(eventObject)
                            )
                          );
                    }
                    return onKeyDown(event);
                  }
                  (open || openOnArrowKeyDown || !isArrowKey) &&
                    (isNavigationKey && (keyRef.current = nested && isMainKey ? null : event.key),
                    nested
                      ? isCrossOpenKey &&
                        (stopEvent(event),
                        open
                          ? ((indexRef.current = getMinIndex(listRef, disabledIndices)),
                            onNavigate(indexRef.current))
                          : onOpenChange(!0, event.nativeEvent, 'list-navigation'))
                      : isMainKey &&
                        (null != selectedIndex && (indexRef.current = selectedIndex),
                        stopEvent(event),
                        !open && openOnArrowKeyDown
                          ? onOpenChange(!0, event.nativeEvent, 'list-navigation')
                          : onKeyDown(event),
                        open && onNavigate(indexRef.current)));
                },
                onFocus() {
                  open && onNavigate(null);
                },
                onPointerDown: function checkVirtualPointer(event) {
                  (focusItemOnOpenRef.current = focusItemOnOpen),
                    'auto' === focusItemOnOpen &&
                      isVirtualPointerEvent(event.nativeEvent) &&
                      (focusItemOnOpenRef.current = !0);
                },
                onMouseDown: checkVirtualMouse,
                onClick: checkVirtualMouse,
              },
              floating: {
                'aria-orientation': 'both' === orientation ? void 0 : orientation,
                ...(!isTypeableCombobox(domReference) && ariaActiveDescendantProp),
                onKeyDown,
                onPointerMove() {
                  isPointerModalityRef.current = !0;
                },
              },
              item,
            };
          }, [
            domReference,
            refs,
            activeId,
            virtualId,
            disabledIndicesRef,
            latestOpenRef,
            listRef,
            enabled,
            orientation,
            rtl,
            virtual,
            open,
            hasActiveIndex,
            nested,
            selectedIndex,
            openOnArrowKeyDown,
            allowEscape,
            cols,
            loop,
            focusItemOnOpen,
            onNavigate,
            onOpenChange,
            item,
            tree,
            virtualItemRef,
            itemSizes,
            dense,
          ]);
        }
        const componentRoleToAriaRoleMap = new Map([
          ['select', 'listbox'],
          ['combobox', 'listbox'],
          ['label', !1],
        ]);
        function useRole(context, props) {
          var _componentRoleToAriaR;
          void 0 === props && (props = {});
          const { open, floatingId } = context,
            { enabled = !0, role = 'dialog' } = props,
            ariaRole =
              null != (_componentRoleToAriaR = componentRoleToAriaRoleMap.get(role))
                ? _componentRoleToAriaR
                : role,
            referenceId = useId(),
            isNested = null != useFloatingParentNodeId();
          return react.useMemo(() => {
            if (!enabled) return {};
            const floatingProps = { id: floatingId, ...(ariaRole && { role: ariaRole }) };
            return 'tooltip' === ariaRole || 'label' === role
              ? {
                  reference: {
                    ['aria-' + ('label' === role ? 'labelledby' : 'describedby')]: open
                      ? floatingId
                      : void 0,
                  },
                  floating: floatingProps,
                }
              : {
                  reference: {
                    'aria-expanded': open ? 'true' : 'false',
                    'aria-haspopup': 'alertdialog' === ariaRole ? 'dialog' : ariaRole,
                    'aria-controls': open ? floatingId : void 0,
                    ...('listbox' === ariaRole && { role: 'combobox' }),
                    ...('menu' === ariaRole && { id: referenceId }),
                    ...('menu' === ariaRole && isNested && { role: 'menuitem' }),
                    ...('select' === role && { 'aria-autocomplete': 'none' }),
                    ...('combobox' === role && { 'aria-autocomplete': 'list' }),
                  },
                  floating: {
                    ...floatingProps,
                    ...('menu' === ariaRole && { 'aria-labelledby': referenceId }),
                  },
                  item(_ref) {
                    let { active, selected } = _ref;
                    const commonProps = {
                      role: 'option',
                      ...(active && { id: floatingId + '-option' }),
                    };
                    switch (role) {
                      case 'select':
                        return { ...commonProps, 'aria-selected': active && selected };
                      case 'combobox':
                        return { ...commonProps, ...(active && { 'aria-selected': !0 }) };
                    }
                    return {};
                  },
                };
          }, [enabled, role, ariaRole, open, floatingId, referenceId, isNested]);
        }
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        function getNodeName(node) {
          return isNode(node) ? (node.nodeName || '').toLowerCase() : '#document';
        }
        function getWindow(node) {
          var _node$ownerDocument;
          return (
            (null == node || null == (_node$ownerDocument = node.ownerDocument)
              ? void 0
              : _node$ownerDocument.defaultView) || window
          );
        }
        function getDocumentElement(node) {
          var _ref;
          return null ==
            (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document)
            ? void 0
            : _ref.documentElement;
        }
        function isNode(value) {
          return value instanceof Node || value instanceof getWindow(value).Node;
        }
        function isElement(value) {
          return value instanceof Element || value instanceof getWindow(value).Element;
        }
        function isHTMLElement(value) {
          return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
        }
        function isShadowRoot(value) {
          return (
            'undefined' != typeof ShadowRoot &&
            (value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot)
          );
        }
        function isOverflowElement(element) {
          const { overflow, overflowX, overflowY, display } = getComputedStyle(element);
          return (
            /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) &&
            !['inline', 'contents'].includes(display)
          );
        }
        function isTableElement(element) {
          return ['table', 'td', 'th'].includes(getNodeName(element));
        }
        function isContainingBlock(element) {
          const webkit = isWebKit(),
            css = getComputedStyle(element);
          return (
            'none' !== css.transform ||
            'none' !== css.perspective ||
            (!!css.containerType && 'normal' !== css.containerType) ||
            (!webkit && !!css.backdropFilter && 'none' !== css.backdropFilter) ||
            (!webkit && !!css.filter && 'none' !== css.filter) ||
            ['transform', 'perspective', 'filter'].some((value) =>
              (css.willChange || '').includes(value),
            ) ||
            ['paint', 'layout', 'strict', 'content'].some((value) =>
              (css.contain || '').includes(value),
            )
          );
        }
        function getContainingBlock(element) {
          let currentNode = getParentNode(element);
          for (; isHTMLElement(currentNode) && !isLastTraversableNode(currentNode); ) {
            if (isContainingBlock(currentNode)) return currentNode;
            currentNode = getParentNode(currentNode);
          }
          return null;
        }
        function isWebKit() {
          return (
            !('undefined' == typeof CSS || !CSS.supports) &&
            CSS.supports('-webkit-backdrop-filter', 'none')
          );
        }
        function isLastTraversableNode(node) {
          return ['html', 'body', '#document'].includes(getNodeName(node));
        }
        function getComputedStyle(element) {
          return getWindow(element).getComputedStyle(element);
        }
        function getNodeScroll(element) {
          return isElement(element)
            ? { scrollLeft: element.scrollLeft, scrollTop: element.scrollTop }
            : { scrollLeft: element.pageXOffset, scrollTop: element.pageYOffset };
        }
        function getParentNode(node) {
          if ('html' === getNodeName(node)) return node;
          const result =
            node.assignedSlot ||
            node.parentNode ||
            (isShadowRoot(node) && node.host) ||
            getDocumentElement(node);
          return isShadowRoot(result) ? result.host : result;
        }
        function getNearestOverflowAncestor(node) {
          const parentNode = getParentNode(node);
          return isLastTraversableNode(parentNode)
            ? node.ownerDocument
              ? node.ownerDocument.body
              : node.body
            : isHTMLElement(parentNode) && isOverflowElement(parentNode)
              ? parentNode
              : getNearestOverflowAncestor(parentNode);
        }
        function getOverflowAncestors(node, list, traverseIframes) {
          var _node$ownerDocument2;
          void 0 === list && (list = []), void 0 === traverseIframes && (traverseIframes = !0);
          const scrollableAncestor = getNearestOverflowAncestor(node),
            isBody =
              scrollableAncestor ===
              (null == (_node$ownerDocument2 = node.ownerDocument)
                ? void 0
                : _node$ownerDocument2.body),
            win = getWindow(scrollableAncestor);
          return isBody
            ? list.concat(
                win,
                win.visualViewport || [],
                isOverflowElement(scrollableAncestor) ? scrollableAncestor : [],
                win.frameElement && traverseIframes ? getOverflowAncestors(win.frameElement) : [],
              )
            : list.concat(
                scrollableAncestor,
                getOverflowAncestors(scrollableAncestor, [], traverseIframes),
              );
        }
        __webpack_require__.d(__webpack_exports__, {
          $4: () => getParentNode,
          CP: () => getNodeScroll,
          L9: () => getComputedStyle,
          Lv: () => isTableElement,
          Ng: () => isShadowRoot,
          Tc: () => isWebKit,
          ZU: () => isOverflowElement,
          ep: () => getDocumentElement,
          eu: () => isLastTraversableNode,
          gJ: () => getContainingBlock,
          mq: () => getNodeName,
          sQ: () => isContainingBlock,
          sb: () => isHTMLElement,
          v9: () => getOverflowAncestors,
          vq: () => isElement,
          zk: () => getWindow,
        });
      },
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@floating-ui/utils/dist/floating-ui.utils.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, {
          B1: () => rectToClientRect,
          C0: () => getSide,
          Dz: () => getAlignmentAxis,
          Jx: () => createCoords,
          LI: () => round,
          PG: () => getOppositeAxis,
          RI: () => floor,
          Sg: () => getAlignment,
          T9: () => max,
          TV: () => getSideAxis,
          WJ: () => getExpandedPlacements,
          _3: () => evaluate,
          bV: () => getOppositePlacement,
          jk: () => min,
          lP: () => getOppositeAxisPlacements,
          nI: () => getPaddingObject,
          qE: () => clamp,
          sq: () => getAxisLength,
          w7: () => getAlignmentSides,
        });
        const min = Math.min,
          max = Math.max,
          round = Math.round,
          floor = Math.floor,
          createCoords = (v) => ({ x: v, y: v }),
          oppositeSideMap = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' },
          oppositeAlignmentMap = { start: 'end', end: 'start' };
        function clamp(start, value, end) {
          return max(start, min(value, end));
        }
        function evaluate(value, param) {
          return 'function' == typeof value ? value(param) : value;
        }
        function getSide(placement) {
          return placement.split('-')[0];
        }
        function getAlignment(placement) {
          return placement.split('-')[1];
        }
        function getOppositeAxis(axis) {
          return 'x' === axis ? 'y' : 'x';
        }
        function getAxisLength(axis) {
          return 'y' === axis ? 'height' : 'width';
        }
        function getSideAxis(placement) {
          return ['top', 'bottom'].includes(getSide(placement)) ? 'y' : 'x';
        }
        function getAlignmentAxis(placement) {
          return getOppositeAxis(getSideAxis(placement));
        }
        function getAlignmentSides(placement, rects, rtl) {
          void 0 === rtl && (rtl = !1);
          const alignment = getAlignment(placement),
            alignmentAxis = getAlignmentAxis(placement),
            length = getAxisLength(alignmentAxis);
          let mainAlignmentSide =
            'x' === alignmentAxis
              ? alignment === (rtl ? 'end' : 'start')
                ? 'right'
                : 'left'
              : 'start' === alignment
                ? 'bottom'
                : 'top';
          return (
            rects.reference[length] > rects.floating[length] &&
              (mainAlignmentSide = getOppositePlacement(mainAlignmentSide)),
            [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)]
          );
        }
        function getExpandedPlacements(placement) {
          const oppositePlacement = getOppositePlacement(placement);
          return [
            getOppositeAlignmentPlacement(placement),
            oppositePlacement,
            getOppositeAlignmentPlacement(oppositePlacement),
          ];
        }
        function getOppositeAlignmentPlacement(placement) {
          return placement.replace(/start|end/g, (alignment) => oppositeAlignmentMap[alignment]);
        }
        function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
          const alignment = getAlignment(placement);
          let list = (function getSideList(side, isStart, rtl) {
            const lr = ['left', 'right'],
              rl = ['right', 'left'],
              tb = ['top', 'bottom'],
              bt = ['bottom', 'top'];
            switch (side) {
              case 'top':
              case 'bottom':
                return rtl ? (isStart ? rl : lr) : isStart ? lr : rl;
              case 'left':
              case 'right':
                return isStart ? tb : bt;
              default:
                return [];
            }
          })(getSide(placement), 'start' === direction, rtl);
          return (
            alignment &&
              ((list = list.map((side) => side + '-' + alignment)),
              flipAlignment && (list = list.concat(list.map(getOppositeAlignmentPlacement)))),
            list
          );
        }
        function getOppositePlacement(placement) {
          return placement.replace(/left|right|bottom|top/g, (side) => oppositeSideMap[side]);
        }
        function getPaddingObject(padding) {
          return 'number' != typeof padding
            ? (function expandPaddingObject(padding) {
                return { top: 0, right: 0, bottom: 0, left: 0, ...padding };
              })(padding)
            : { top: padding, right: padding, bottom: padding, left: padding };
        }
        function rectToClientRect(rect) {
          return {
            ...rect,
            top: rect.y,
            left: rect.x,
            right: rect.x + rect.width,
            bottom: rect.y + rect.height,
          };
        }
      },
  },
]);
