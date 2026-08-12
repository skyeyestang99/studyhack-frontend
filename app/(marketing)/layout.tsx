import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

/**
 * Marketing chrome: top nav + footer.
 *
 * Only public, pre-signup pages get this. The root layout used to wrap the whole
 * product in it, so the dashboard and chat carried a marketing footer below the
 * fold — which on a phone meant the composer never sat at the bottom of the
 * viewport and the app read as a webpage rather than an app.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
