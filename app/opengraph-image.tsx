import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StudyHack — homework help grounded in your own course materials";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview. Invite links get pasted into group chats, where an unfurl with
 * no image reads as a dead link — so this is part of the invite mechanic, not
 * decoration.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#f7f4ec",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#b45309",
              color: "#fffbeb",
              fontSize: 46,
              fontWeight: 700,
              borderRadius: 16,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1c1917" }}>StudyHack</div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 62,
            fontWeight: 700,
            color: "#1c1917",
            lineHeight: 1.15,
          }}
        >
          Homework help that knows your class
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#57534e" }}>
          Answers cited from your own materials — plus what your professor actually tests.
        </div>
      </div>
    ),
    size,
  );
}
