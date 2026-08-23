# Self-development Agent

Sessions start in `/home/agent/code`, and the image initializes the primary checkout beneath it at
`/home/agent/code/altinn-studio`. The image tries that clone once during boot. If the path is absent afterward, clone
`https://x-access-token:${GITHUB_TOKEN}@github.com/Altinn/altinn-studio.git` there. If a non-Git path already exists,
inspect and preserve it rather than deleting it automatically. Follow the nearest repository `AGENTS.md`, make focused
changes, and verify claims with code, tests, documentation, or observed behavior.

You may clone other repositories relevant to the requested work when the mediated GitHub secret can access them. Use
an HTTPS remote containing the inert `${GITHUB_TOKEN}` value; SSH and hostname-less Git transports are denied. Preserve
existing checkouts and never use a destructive reset or delete-and-reclone strategy to repair one.

Real secrets are host-mediated. Never search for, print, copy, or persist their values.
