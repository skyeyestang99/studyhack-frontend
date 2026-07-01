import { describe, expect, it } from "vitest";
import {
  acronym,
  rankMatches,
  STRONG_MATCH_THRESHOLD,
} from "@/lib/entity-search";

const schools = [
  { name: "UC Santa Cruz", shortName: "UCSC", aliases: [] },
  {
    name: "University of California, San Diego",
    shortName: "UC San Diego",
    aliases: ["UCSD"],
  },
  { name: "University of Southern California", shortName: "USC", aliases: [] },
  { name: "San Diego State University", shortName: "SDSU", aliases: [] },
  { name: "Stanford University", aliases: [] },
  { name: "University of San Diego", shortName: "USD", aliases: [] },
];

describe("rankMatches", () => {
  it("builds useful acronyms from full and shortened school names", () => {
    expect(acronym("UC San Diego")).toBe("ucsd");
    expect(acronym("University of California, San Diego")).toBe("ucsd");
  });

  it("ranks UC San Diego first for ucsd", () => {
    const matches = rankMatches(schools, "ucsd");

    expect(matches.length).toBeLessThanOrEqual(5);
    expect(matches[0].item.name).toBe("University of California, San Diego");
    expect(matches[0].strong).toBe(true);
  });

  it("uses aliases and tolerates typos", () => {
    expect(rankMatches(schools, "UC San Deigo")[0].item.shortName).toBe(
      "UC San Diego",
    );
    expect(rankMatches(schools, "SDSU")[0].item.name).toBe(
      "San Diego State University",
    );
  });

  it("marks unrelated input below the creation guard threshold", () => {
    const matches = rankMatches(schools, "Northbridge Technical College");

    expect(matches[0]?.score ?? 0).toBeLessThan(STRONG_MATCH_THRESHOLD);
    expect(matches.some((match) => match.strong)).toBe(false);
  });

  it("ranks professor names within the caller-provided school scope", () => {
    const selectedSchoolProfessors = [
      { name: "Dana Smith" },
      { name: "Daniel Smythe" },
    ];

    expect(rankMatches(selectedSchoolProfessors, "d smith")[0].item.name).toBe(
      "Dana Smith",
    );
  });
});
