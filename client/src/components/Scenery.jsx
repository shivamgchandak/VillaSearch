// Small drawn scenes for villa cards and region tiles, one per landscape.
// They stand in for photos until real ones are added.
const FOR_TERRAIN = { mountain: "mountain", beach: "beach", lake: "lake", river: "lake", forest: "forest", vineyard: "mountain", heritage: "heritage", desert: "desert" };

export function sceneFor(terrains = []) {
  const hit = terrains.find((terrain) => FOR_TERRAIN[terrain]);
  return hit ? FOR_TERRAIN[hit] : "mountain";
}

function Scene({ kind }) {
  switch (kind) {
    case "beach":
      return (
        <>
          <rect width="320" height="160" fill="#F6E7C6" />
          <circle cx="226" cy="62" r="22" fill="#F2B45A" />
          <path d="M0 108 Q80 98 160 108 T320 106 V160 H0Z" fill="#7FC1C0" />
          <path d="M0 124 Q70 116 150 126 T320 122 V160 H0Z" fill="#2E7C7A" />
          <path d="M0 146 Q90 138 200 146 T320 144 V160 H0Z" fill="#EAD9B0" />
        </>
      );
    case "lake":
      return (
        <>
          <rect width="320" height="160" fill="#DCE7EF" />
          <path d="M0 104 L64 58 L134 100 L204 64 L320 104Z" fill="#9BB7C9" />
          <rect y="104" width="320" height="56" fill="#3D6B82" />
          <path d="M0 104 L64 136 L134 108 L204 132 L320 104Z" fill="#9BB7C9" opacity="0.35" />
          <path d="M40 124 H110 M170 138 H260" stroke="#EEF4F7" strokeWidth="2" opacity="0.6" />
        </>
      );
    case "forest":
      return (
        <>
          <rect width="320" height="160" fill="#D6E5CF" />
          <path d="M0 110 Q160 84 320 108 V160 H0Z" fill="#6E9C6B" />
          <path d="M12 150 L28 100 L44 150Z M48 150 L64 92 L80 150Z M86 150 L102 108 L118 150Z M120 150 L136 96 L152 150Z M158 150 L174 104 L190 150Z M192 150 L208 90 L224 150Z M230 150 L246 106 L262 150Z M264 150 L280 98 L296 150Z M296 150 L312 110 L328 150Z" fill="#1F4D35" />
        </>
      );
    case "desert":
      return (
        <>
          <rect width="320" height="160" fill="#F6E6C8" />
          <circle cx="232" cy="52" r="18" fill="#F2B45A" />
          <path d="M0 118 Q70 88 150 112 T320 104 V160 H0Z" fill="#E3BF86" />
          <path d="M0 140 Q110 116 210 138 T320 132 V160 H0Z" fill="#C8955A" />
        </>
      );
    case "heritage":
      return (
        <>
          <rect width="320" height="160" fill="#F3E2CB" />
          <rect x="90" y="80" width="140" height="80" fill="#D9A77A" />
          <path d="M126 80 Q160 30 194 80Z" fill="#9C5B3B" />
          <path d="M104 160 V122 Q116 104 128 122 V160Z M144 160 V122 Q156 104 168 122 V160Z M184 160 V122 Q196 104 208 122 V160Z" fill="#FFF4E3" />
          <rect y="150" width="320" height="10" fill="#9C5B3B" />
        </>
      );
    default:
      return (
        <>
          <rect width="320" height="160" fill="#CFE0DA" />
          <circle cx="244" cy="46" r="14" fill="#F3E6C4" />
          <path d="M0 112 L64 58 L134 104 L204 42 L320 110 V160 H0Z" fill="#8FB3A5" />
          <path d="M0 160 V128 L86 86 L166 130 L246 94 L320 126 V160Z" fill="#2F5E4E" />
        </>
      );
  }
}

export default function Scenery({ terrains, kind, className }) {
  return (
    <svg className={className} viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Scene kind={kind || sceneFor(terrains)} />
    </svg>
  );
}
