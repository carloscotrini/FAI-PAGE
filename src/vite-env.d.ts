/// <reference types="vite/client" />

// The standard Vite ambient declaration. Without it `import.meta.env` is not
// typed and `tsc -b` fails with TS2339 before vite build ever runs, which is
// what happened the first time src/data/weekends.ts read BASE_URL.
