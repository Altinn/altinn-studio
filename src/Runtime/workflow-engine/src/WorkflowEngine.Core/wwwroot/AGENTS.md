# AGENTS.md

Read [README.md](README.md) and [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) before changing the dashboard.

After changing generated markup, run these checks from this directory and fix every hit. Each hit is an `esc()`
call inside an attribute or an inline handler argument, where `escAttr()` or `escJsArg()` belongs:

```sh
grep -rnE '[a-zA-Z-]+="[^"]*\$\{esc\(' modules/
grep -rn "'\${esc(" modules/
```
