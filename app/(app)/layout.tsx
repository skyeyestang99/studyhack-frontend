/**
 * App shell.
 *
 * Signed-in surfaces get a fixed-height container and no marketing chrome, so a
 * child route can own the viewport — which is what lets chat pin its composer to
 * the bottom instead of pushing it below a footer.
 *
 * h-dvh rather than h-screen: on mobile Safari, 100vh includes the retracted URL
 * bar, so a "full height" column ends up taller than what is actually visible and
 * the composer sits just off-screen. dvh tracks the real viewport.
 *
 * min-h-0 matters on the inner wrapper: without it a flex child refuses to shrink
 * below its content height and the inner scroll container never scrolls.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
