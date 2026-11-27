## This computer

- There are no containers, Kubernetes or browser, so LocalTest and browser checks cannot run here. Say so rather than
  work around it.
- Pull request evidence is limited to terminal recordings, with `asciinema` and `agg`.
- Hugo builds altinn-studio-docs at the version its CI pins. Its CI then checks the built site's links with hyperlink,
  which is not installed here, so leave that check to CI and say so.
