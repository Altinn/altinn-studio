/**
 * This workaround will make sure that styles from libraries are injected before altinn-app-frontend.css
 * Otherwise we would have to use !important or unnecessarily great specificity in our styles to override styles from libraries
 * @see https://github.com/Altinn/app-frontend-react/issues/1000
 *
 * In production our own styles arrive as a <link> element in the backend-generated HTML, so library
 * styles are inserted before the first <link>. In dev mode the Vite dev server injects all of our
 * CSS as <style data-vite-dev-id> tags instead; those are left untouched (so hot-reloading keeps
 * working), and library styles are inserted before the first of them to get the same precedence.
 */
const appendHead = document.head.appendChild.bind(document.head);
const getReferenceNode = () =>
  document.head.querySelector('style[data-vite-dev-id]') ?? document.head.querySelector('link');
document.head.appendChild = function (child) {
  if (child instanceof HTMLStyleElement && !child.hasAttribute('data-vite-dev-id')) {
    return document.head.insertBefore(child, getReferenceNode());
  }
  return appendHead(child);
};
