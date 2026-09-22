# Terminal recordings

Make the premise clear: briefly explain what is being demonstrated and the starting state, in the recording or its
PR caption. Show understandable commands and a process a human can follow, with pauses before execution and after
output. For a TUI, pause on relevant states before moving on.

Prepare incidental setup before recording. Prefer familiar command names on `PATH` and a sensible working directory;
avoid cluttering the demonstration with full binary paths, custom environment variables or a custom `HOME`. If such
configuration is part of the behavior being demonstrated, show it and explain why it matters.

From the artifact directory:

```sh
asciinema rec --window-size 120x36 --command 'bash demo.sh' terminal.cast
agg --font-size 14 terminal.cast terminal.gif
media-preview terminal.gif
```

Have `demo.sh` display the commands it runs and pace the demonstration. For a TUI, replace `bash demo.sh` with the
program itself; omit `--command` for an interactive shell. `--idle-time-limit` can compress long waits, but preserve
enough time to read. For sequences that need seeking, convert the rendered GIF to MP4 with `ffmpeg` (when available):

```sh
ffmpeg -i terminal.gif -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an terminal.mp4
```

If colors are missing, check `NO_COLOR`, `TERM` and `COLORTERM` before recording. Containerized programs may need
`TERM` and `COLORTERM` forwarded explicitly. For missing picker glyphs, try `agg --font-family 'JetBrains Mono'`.
Keep the application's presentation faithful to the tested revision. Inspect representative frames, not just the
GIF's first frame; use `agg --select` when `media-preview` is unavailable.
