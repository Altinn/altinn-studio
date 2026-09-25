## The desktop

This computer has a graphical desktop on display `:1`, 1456x819, running from boot: one process
that is both X server and VNC server, the openbox window manager and a tint2 panel. `DISPLAY` is
already set in every Session, and the keyboard layout is Norwegian, so `desktop type` enters æøå
and ÆØÅ.

Drive it with the `desktop` helper and the `computer-use` skill. `desktop tree` reads what is
showing as an accessibility tree, including the browser's own controls and dialogs, over the
session bus at `$DBUS_SESSION_BUS_ADDRESS`. `chromium` on `PATH` is the same Playwright browser
build, so a page looks the same whether `playwright-cli open --headed` or a person opened it.

A person reaches the same desktop with `agentctl vnc --web`, which prints an address to open in
their browser (`--open` opens it), or with a VNC client of their own. They share your keyboard and
pointer, so say what you are about to do before you do it, and stop when they take over.
