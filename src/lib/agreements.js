/** Agreement file helpers — validate magic bytes; never trust extension/MIME alone */

export function agreementExt(name) {
  const m = /\.(pdf|doc|docx)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

export function stripAgreementForStore(agreements) {
  return (agreements || []).map(({ dataUrl, ...rest }) => ({
    ...rest,
    isPdf: rest.isPdf ?? (agreementExt(rest.name) === "pdf"),
  }));
}

export function dataForEncryptedStore(data) {
  if (!data?.partners?.length) return data;
  return {
    ...data,
    partners: data.partners.map(p => ({
      ...p,
      agreements: stripAgreementForStore(p.agreements),
    })),
  };
}

export function agreementMimeForExt(ext) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "";
}

export function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch { return null; }
}

export function isPdfBytes(bytes) {
  return bytes && bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D;
}

export function isDocxBytes(bytes) {
  return bytes && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function isDocBytes(bytes) {
  return bytes && bytes.length >= 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
}

export function bytesMatchExt(bytes, ext) {
  if (ext === "pdf") return isPdfBytes(bytes);
  if (ext === "docx") return isDocxBytes(bytes);
  if (ext === "doc") return isDocBytes(bytes);
  return false;
}

export function agreementRecordIsPdf(a) {
  if (agreementExt(a.name) !== "pdf") return false;
  if (!a.dataUrl) return false;
  const bytes = dataUrlToBytes(a.dataUrl);
  return !!(bytes && isPdfBytes(bytes));
}
