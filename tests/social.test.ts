import { describe, expect, it } from "vitest";

import { crosspostCaption, hashtagForOrg } from "@/lib/social";

describe("hashtagForOrg", () => {
  it("builds a stable PascalCase hashtag from Latin names", () => {
    expect(hashtagForOrg("Croissant Rouge Tunisien")).toBe("#CroissantRougeTunisien");
    expect(hashtagForOrg("JCI — Bizerte")).toBe("#JCIBizerte");
  });

  it("keeps Arabic letters and removes punctuation", () => {
    expect(hashtagForOrg("جمعية الخير")).toBe("#جمعيةالخير");
  });

  it("falls back when the name has no usable characters", () => {
    expect(hashtagForOrg("— —")).toBe("#YedLkhirOrg");
  });
});

describe("crosspostCaption", () => {
  it("appends the organization and platform hashtags", () => {
    const caption = crosspostCaption("Nettoyage de la plage", "Croissant Rouge Tunisien");
    expect(caption).toContain("#CroissantRougeTunisien");
    expect(caption).toContain("#YedLkhir");
  });

  it("does not duplicate hashtags already present", () => {
    const caption = crosspostCaption(
      "Nettoyage #croissantrougetunisien #YEDLKHIR",
      "Croissant Rouge Tunisien",
    );
    expect(caption.toLowerCase().match(/#croissantrougetunisien/g)).toHaveLength(1);
    expect(caption.toLowerCase().match(/#yedlkhir/g)).toHaveLength(1);
  });

  it("stays within the Graph caption limit", () => {
    const caption = crosspostCaption("x".repeat(2190), "Org");
    expect(caption.length).toBeLessThanOrEqual(2200);
  });
});
