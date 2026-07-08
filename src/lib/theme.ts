export const theme = {
  app: {
    bg: "#09090f",
    sidebar: "rgba(0,0,0,0.85)",
    header: "rgba(0,0,0,0.9)",
    overlay: "rgba(0,0,0,0.6)",
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
