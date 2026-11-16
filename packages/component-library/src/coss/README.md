# Coss UI (vendored)

Stock UI primitives from [cosscom/ui](https://github.com/cosscom/ui), copied into this
tree for the Coss-based component rewrite. The upstream license is in `LICENSE`.

Nothing under `src/coss` is exported from `@actual-app/components` yet. Production
app bundles do not import `styles/globals.css`; Tailwind is wired for Storybook and
future integration only.
