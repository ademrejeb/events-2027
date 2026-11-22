# Vendored `@adem.rejeb/ui` 0.1.1

`adem.rejeb-ui-0.1.1.tgz` is the `npm pack` output of the UI workspace at
`personal-ui` commit `b232673`:

> fix(ui): keep layout spacing when tokens arrive late; own button sizes

The local npm token cannot publish to the `@adem.rejeb` scope (`E404`), and
Render must install the fixed build, so `package.json` points at this tarball
with `file:`. Regenerate after a UI change:

```bash
cd ui
npm run build:ui
npm pack --workspace @adem.rejeb/ui --pack-destination ../project-2027-app/vendor
```

Then update the `file:` path in `package.json` and run `npm install`.
