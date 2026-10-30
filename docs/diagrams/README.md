# Diagrams

Diagrams that span components. [architecture.svg](architecture.svg) shows how Altinn Studio fits together. New
diagrams are handwritten SVG in the shared style, so they diff as text and anyone, person or agent, can change them in
an editor. The older diagrams are Excalidraw and draw.io exports, which you change in those tools.

## The shared style

The style follows the Altinn profile in Designsystemet, as the design team specified it. [diagram.css](style/diagram.css)
holds its colors, sizes and classes. A diagram that GitHub shows as an image cannot load a stylesheet or a font, so
each diagram carries its own copy of both, between its `diagram-style` markers.

- Blue is the control plane and Core, green the data plane and Runtime, purple Platform and gray what runs outside
  the clusters. An arrow takes the color of the plane it belongs to.
- Each diagram fills one card, its main tool, such as Designer.
- Two offset frames behind a zone mean one per environment.
- A dashed line separates the planes, and frames what runs outside the clusters.
- Labels are in sentence case. Arrows bend only at right angles. Nothing has shadows, gradients or transparency.

## Making a diagram

1. Start from [architecture.svg](architecture.svg). Copy its `<style>` markers and arrow markers, and use the classes
   in diagram.css.
2. Run `yarn diagrams:sync`, which copies the style and the font into each diagram with the markers.
3. Run `yarn diagrams:check`, which CI also runs. It renders each diagram in headless Chrome, and fails when text runs
   past its box, uses a character the font lacks, or the diagram's copy of the style is out of date. Size boxes from
   what it reports, since Inter is wider than the fonts you might estimate with.
4. Look at the rendered diagram before you open a pull request. The check cannot see overlaps or an arrow that
   points the wrong way.

## The font

The diagrams use [Inter](https://github.com/rsms/inter) under the [SIL Open Font License](style/fonts/OFL.txt), which
lets us subset and embed it. The files are subset to the character ranges in
[style.mjs](../../scripts/diagrams/style.mjs), which keeps a diagram near 100 KB. To add characters, extend the ranges
and subset the Regular, Medium and SemiBold TTFs from an Inter release again with fonttools:

```sh
pyftsubset Inter-Regular.ttf --unicodes="$(node scripts/diagrams/style.mjs unicodes)" \
  --layout-features='kern,liga,calt,cv05' --flavor=woff2 --output-file=docs/diagrams/style/fonts/Inter-Regular.woff2
```
