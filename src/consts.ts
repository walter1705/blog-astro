// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'walter.dev';
export const SITE_DESCRIPTION = 'Junior Fullstack Developer — Portfolio & Blog';

// BASE is resolved by Vite at build time from astro.config.mjs `base` option.
// Importing this from a .ts module guarantees Vite processes it correctly,
// unlike using import.meta.env.BASE_URL directly in .astro frontmatter.
const _base = import.meta.env.BASE_URL;
export const BASE = _base.endsWith('/') ? _base : _base + '/';
