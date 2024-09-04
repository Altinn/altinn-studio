try {
  (() => {
    var d = __STORYBOOK_API__,
      {
        ActiveTabs: S,
        Consumer: c,
        ManagerContext: p,
        Provider: h,
        RequestResponseError: T,
        addons: r,
        combineParameters: O,
        controlOrMetaKey: b,
        controlOrMetaSymbol: g,
        eventMatchesShortcut: y,
        eventToShortcut: A,
        experimental_requestResponse: R,
        isMacLike: M,
        isShortcutTaken: f,
        keyToSymbol: x,
        merge: C,
        mockChannel: E,
        optionOrAltSymbol: k,
        shortcutMatchesShortcut: P,
        shortcutToHumanString: v,
        types: I,
        useAddonState: K,
        useArgTypes: B,
        useArgs: G,
        useChannel: Y,
        useGlobalTypes: H,
        useGlobals: q,
        useParameter: w,
        useSharedState: N,
        useStoryPrepared: L,
        useStorybookApi: j,
        useStorybookState: z,
      } = __STORYBOOK_API__;
    var U = __STORYBOOK_THEMING_CREATE__,
      { create: s, themes: V } = __STORYBOOK_THEMING_CREATE__;
    var a = s({
      base: 'light',
      brandTitle: 'Altinn Studio',
      brandImage: 'https://docs.altinn.studio/images/altinnstudio-logo-white.svg',
    });
    r.setConfig({ theme: a, sidebar: { showRoots: !0 } });
  })();
} catch (e) {
  console.error('[Storybook] One of your manager-entries failed: ' + import.meta.url, e);
}
