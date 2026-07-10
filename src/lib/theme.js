export const C = {
  bg: "#ECF1F8", surface: "#FFFFFF", surfaceAlt: "#F4F7FC",
  ink: "#16213A", ink2: "#55627B", ink3: "#8A96AC",
  line: "#E0E7F1", lineSoft: "#ECF1F7",
  brand: "#2F6FD0", brandDeep: "#13245C", brandSoft: "#DBE8FB", brandMist: "#EDF3FE",
  gold: "#D9892B", goldSoft: "#F6EAD6",
};

export function hexA(hex, a) {
  const h = (hex || "#000").replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const FONT = {
  display: "'Iowan Old Style','Palatino Linotype','Palatino','Georgia',serif",
  body: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif",
};
