export const theme = {
  app: {
    bg: "#18181b",
    sidebar: "#18181b",
    header: "rgba(24,24,27,0.96)",
    overlay: "rgba(24,24,27,0.45)",
  },

  surface: {
    canvas: "#f4f4f5",
    panel: "#ffffff",
    muted: "#fafafa",
    line: "#e4e4e7",
    ink: "#27272a",
    subdued: "#71717a",
  },

  brand: {
    ztrack: "#ff2e88",
    iq: "#22d3ee",
    purple: "#7a2cff",
    yellow: "#fde047",
  },

  gradient: {
    main: "from-[#ff2e88] via-[#7a2cff] to-[#22d3ee]",
    soft: "from-[#ff2e88]/20 via-[#7a2cff]/20 to-[#22d3ee]/20",
  },

  activity: {
    pilot: "#ff2e88",
    car: "#22d3ee",
    race: "#fde047",
    championship: "#7a2cff",
    part: "#3f3f46",
  },
} as const;
