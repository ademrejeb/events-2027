# Vendored `@adem.rejeb/ui` 0.1.2

`adem.rejeb-ui-0.1.2.tgz` is the `npm pack` output of the UI workspace at
`personal-ui` commit `c9aefcc`:

> fix(ui): stop Stack and Grid clearing the gap shorthand on client renders

This is the real first-paint/gap fix: React clears undefined inline style keys,
and Stack/Grid used to always emit `rowGap: undefined` / `columnGap: undefined`,
which wiped the `gap` shorthand on every client-side render. SSR kept the raw
style, which is why a refresh looked right and navigating lost the gaps.

0.1.2 also carries the 0.1.1 changes: literal fallbacks on every
`--ui-p-space-*` inline reference, and library-owned button geometry.

The local npm token cannot publish to the `@adem.rejeb` scope (`E404`), and
Render must install the fixed build, so `package.json` points at this tarball
with `file:`. Regenerate after a UI change:

```bash
cd ui
npm run build:ui
npm pack --workspace @adem.rejeb/ui --pack-destination ../project-2027-app/vendor
```

Then update the `file:` path in `package.json` and run `npm install`.
