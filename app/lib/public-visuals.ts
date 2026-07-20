/**
 * Replaceable hero-media contract for the public timber homepage.
 *
 * To replace the homepage hero image, edit ONLY this manifest plus the asset
 * file at the `src` path (relative to `public/`). Every property below is
 * consumed by the homepage component; no other file stores hero dimensions,
 * attribution, or licensing metadata.
 */

export interface HeroMedia {
  /** Public-relative path to the local image file. Must start with "/". */
  readonly src: string;
  /** Intrinsic image width in pixels (must match the file on disk). */
  readonly width: number;
  /** Intrinsic image height in pixels (must match the file on disk). */
  readonly height: number;
  /**
   * Accessible alt text describing the image content.
   * Keep in sync with the actual image subject.
   */
  readonly alt: string;
  /**
   * CSS `object-position` value that centres the image on its visual focal
   * point when the container aspect ratio differs from the intrinsic ratio.
   */
  readonly objectPosition: string;
  /** Full name or pseudonym of the creator. */
  readonly creator: string;
  /** Stable URL of the image's source page (Commons, author portfolio, etc.). */
  readonly sourceUrl: string;
  /** SPDX or equivalent short license identifier. */
  readonly license: string;
  /** Stable URL of the full license text or deed. */
  readonly licenseUrl: string;
  /**
   * Disclosure of modifications applied for web presentation.
   * Required by CC BY-SA 3.0 §3(a)(1) when the work is adapted.
   * Must be a human-readable sentence or short paragraph.
   */
  readonly attributionModification: string;
}

export const homeHero: HeroMedia = {
  src: "/images/timber/ryoanji-kuri-1280w.webp",
  width: 3456,
  height: 2304,
  alt: "龙安寺库里本堂内部——传统日式木结构建筑，榻榻米走廊与障子纸门构成纵深空间，自然光从侧面透入",
  objectPosition: "50% 42%",
  creator: "Tedmoseby",
  sourceUrl:
    "https://commons.wikimedia.org/wiki/File:Ryoanji_Temple_-_Kuri_Main_Building_Interior.jpg",
  license: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/deed.en",
  attributionModification:
    "网页展示时可能裁剪画面以适配版式，渲染版本可能经过格式转换与压缩优化。",
};

/** Responsive image sources for the homepage hero. */
export const homeHeroSources = {
  /** WebP source set for modern browsers. */
  srcSet: [
    { src: "/images/timber/ryoanji-kuri-1280w.webp", width: 1280 },
    { src: "/images/timber/ryoanji-kuri-2560w.webp", width: 2560 },
  ],
  /** JPEG fallback for legacy browsers. */
  fallback: "/images/timber/ryoanji-kuri-main-building-interior.jpg",
};
