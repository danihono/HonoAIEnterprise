export type DocStyle = {
  fontBody?: string;
  fontHeading?: string;
  accentColor?: string;
  textColor?: string;
  bgColor?: string;
};

// ── Text extraction ───────────────────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push((content.items as Array<{ str: string }>).map((it) => it.str).join(" "));
    }
    return pages.join("\n\n");
  }

  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  return file.text();
}

// ── Style extraction ──────────────────────────────────────────────────────────

export async function extractStyleFromFile(file: File): Promise<DocStyle> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "docx" || ext === "doc") return extractStyleFromDocx(file);
  if (ext === "pdf") return extractStyleFromPdf(file);
  return {};
}

async function extractStyleFromDocx(file: File): Promise<DocStyle> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    const themeFile = zip.file("word/theme/theme1.xml");
    if (!themeFile) return {};

    const xml = await themeFile.async("string");
    return parseThemeXml(xml);
  } catch {
    return {};
  }
}

function parseThemeXml(xml: string): DocStyle {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const style: DocStyle = {};

    // Heading font (majorFont)
    const majorLatin = doc.querySelector("majorFont > latin, a\\:majorFont > a\\:latin");
    const majorTypeface =
      majorLatin?.getAttribute("typeface") ??
      doc.querySelector("[*|majorFont] > [*|latin]")?.getAttribute("typeface");
    if (majorTypeface && majorTypeface !== "+mj-lt") style.fontHeading = majorTypeface;

    // Body font (minorFont)
    const minorLatin = doc.querySelector("minorFont > latin, a\\:minorFont > a\\:latin");
    const minorTypeface =
      minorLatin?.getAttribute("typeface") ??
      doc.querySelector("[*|minorFont] > [*|latin]")?.getAttribute("typeface");
    if (minorTypeface && minorTypeface !== "+mn-lt") style.fontBody = minorTypeface;

    // Accent color (accent1 = primary brand color)
    const accent1 = findColorValue(doc, "accent1");
    if (accent1) style.accentColor = accent1;

    // Dark base color (text color)
    const dk1 = findColorValue(doc, "dk1");
    if (dk1) style.textColor = dk1;

    // Light base color (background)
    const lt1 = findColorValue(doc, "lt1");
    if (lt1) style.bgColor = lt1;

    return style;
  } catch {
    return {};
  }
}

function findColorValue(doc: Document, tagName: string): string | undefined {
  // Try both namespaced and un-namespaced selectors
  const candidates = [
    doc.querySelector(`${tagName} > srgbClr`),
    doc.querySelector(`${tagName} > sysClr`),
    doc.querySelector(`[*|${tagName}] > [*|srgbClr]`),
    doc.querySelector(`[*|${tagName}] > [*|sysClr]`),
  ];

  for (const el of candidates) {
    if (!el) continue;
    const val = el.getAttribute("val") ?? el.getAttribute("lastClr");
    if (val && val !== "000000" && val.length === 6) return "#" + val;
    if (val === "000000") return "#111111";
  }
  return undefined;
}

async function extractStyleFromPdf(file: File): Promise<DocStyle> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    const fontFamilies = Object.values(
      (content.styles ?? {}) as Record<string, { fontFamily?: string }>
    )
      .map((s) => s.fontFamily)
      .filter((f): f is string => !!f && f !== "sans-serif" && f !== "serif");

    if (fontFamilies.length === 0) return {};

    const count: Record<string, number> = {};
    for (const f of fontFamilies) count[f] = (count[f] ?? 0) + 1;
    const mostCommon = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];

    return mostCommon ? { fontBody: mostCommon } : {};
  } catch {
    return {};
  }
}
