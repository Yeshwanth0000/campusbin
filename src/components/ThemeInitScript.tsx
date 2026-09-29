const THEME_INIT = `
(function () {
  try {
    var dark = localStorage.getItem('theme') === 'dark';
    if (dark) document.documentElement.classList.add('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#020617' : '#ffffff');
  } catch (e) {}
})();
`;

export default function ThemeInitScript({ nonce }: { nonce?: string }) {
  // A plain server-rendered <script> (no next/script) so it's part of the
  // initial HTML and runs before paint — avoids a flash of the wrong theme
  // without React treating it as a client re-render no-op. Needs the CSP
  // nonce since script-src is locked down to 'self' + 'nonce-...'.
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
