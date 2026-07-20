# Image Attribution

## Homepage Hero — Ryōan-ji Kuri Main Building Interior

- **File**: `images/timber/ryoanji-kuri-main-building-interior.jpg`
- **Creator**: Tedmoseby
- **Source**: [Wikimedia Commons — File:Ryoanji Temple - Kuri Main Building Interior.jpg](https://commons.wikimedia.org/wiki/File:Ryoanji_Temple_-_Kuri_Main_Building_Interior.jpg)
- **License**: [CC BY-SA 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/deed.en)
- **Modifications**: The web rendition may be cropped to fit the layout and may be converted/optimised for delivery.

---

## Replacement Checklist (One-Manifest Change)

To replace the homepage hero image, edit exactly **two** locations:

1. **Replace the asset file** at the path recorded in `app/lib/public-visuals.ts` (`homeHero.src`), or place a new file and update `src` to match.
2. **Update `homeHero` in `app/lib/public-visuals.ts`** — change _at minimum_ the following fields:
   - `src` — local public path (must start with `/`)
   - `width` / `height` — actual intrinsic pixel dimensions of the new file
   - `alt` — descriptive Chinese alt text for the new image
   - `objectPosition` — CSS `object-position` focal point
   - `creator` — full name or pseudonym of the creator
   - `sourceUrl` — stable URL of the source page
   - `license` — SPDX or short license identifier
   - `licenseUrl` — stable URL of the full license text/deed
   - `attributionModification` — disclosure of any modifications applied for web presentation
3. **Update this file** (`public/images/ATTRIBUTION.md`) with the new creator, source, license, and modification disclosure.

No other file in the project stores hero dimensions, focal point, or licensing metadata.
