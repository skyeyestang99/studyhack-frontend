/**
 * The app mark, as JSX for next/og ImageResponse.
 *
 * Generated at request time rather than committed as PNGs: there were no icons or
 * favicon at all, and generating keeps the mark in sync with the brand colour
 * without adding binary assets or a design toolchain to the repo.
 */
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b45309",
        color: "#fffbeb",
        fontSize: size * 0.62,
        fontWeight: 700,
        borderRadius: size * 0.22,
      }}
    >
      S
    </div>
  );
}
