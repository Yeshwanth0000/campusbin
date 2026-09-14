const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function ThemeInitScript({ nonce }: { nonce?: string }) {
  // A plain server-rendered <script> (no next/script) so it's part of the
  // initial HTML and runs before paint — avoids a flash of the wrong theme
  // without React treating it as a client re-render no-op. Needs the CSP
  // nonce since script-src is locked down to 'self' + 'nonce-...'.
  // eslint-disable-next-line @next/next/no-sync-scripts
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
