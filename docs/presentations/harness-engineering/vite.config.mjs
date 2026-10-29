export default {
  optimizeDeps: {
    // Prebundle the aliased core entry so its CommonJS dependencies work in dev.
    include: ['mermaid/dist/mermaid.esm.mjs'],
  },
  resolve: {
    alias: {
      // The prebuilt entry embeds DOMPurify, so use the installed dependency.
      'mermaid/dist/mermaid.esm.mjs': 'mermaid/dist/mermaid.core.mjs',
    },
  },
}
