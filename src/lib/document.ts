import type { DocumentSection } from "./claude";
import type { DocStyle } from "./extract";

type DocMeta = { clienteNome: string; servicoPrincipal: string; valorTotal: string };

export async function exportToDocx(
  sections: DocumentSection[],
  meta: DocMeta,
  logo?: string,
  style?: DocStyle
) {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = await import("docx");
  const { saveAs } = await import("file-saver");

  const accentHex = (style?.accentColor ?? "#111111").replace("#", "");
  const headingFont = style?.fontHeading ?? "Arial";
  const bodyFont = style?.fontBody ?? "Georgia";

  const children: InstanceType<typeof Paragraph>[] = [];

  if (logo) {
    try {
      const { ImageRun } = await import("docx");
      const base64Data = logo.split(",")[1];
      const mimeRaw = logo.split(";")[0].split(":")[1] ?? "image/png";
      const imgType = (mimeRaw === "image/jpeg" ? "jpg" : mimeRaw.split("/")[1]) as "png" | "jpg" | "gif" | "bmp";
      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      children.push(new Paragraph({ children: [new ImageRun({ data: bytes, transformation: { width: 160, height: 53 }, type: imgType })] }));
    } catch { /* skip logo on error */ }
  }

  children.push(new Paragraph({
    text: "PROPOSTA COMERCIAL",
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({ text: "" }));

  for (const [label, value] of [
    ["Para", meta.clienteNome],
    ["Serviço", meta.servicoPrincipal],
    ["Valor", meta.valorTotal],
    ["Data", new Date().toLocaleDateString("pt-BR")],
  ] as [string, string][]) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, font: bodyFont }),
        new TextRun({ text: value, font: bodyFont }),
      ],
    }));
  }
  children.push(new Paragraph({ text: "" }));

  for (const section of sections) {
    children.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_1,
      // Note: docx HeadingLevel styling is controlled by document styles
    }));
    for (const line of section.content.split("\n")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line || " ", font: bodyFont })],
      }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { color: accentHex, font: headingFont, bold: true, size: 24 },
        },
        heading2: {
          run: { color: accentHex, font: headingFont, bold: true, size: 22 },
        },
        title: {
          run: { color: accentHex, font: headingFont, bold: true, size: 36 },
        },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `proposta-${meta.clienteNome.replace(/\s+/g, "-")}.docx`);
}

export function printProposal(
  sections: DocumentSection[],
  meta: DocMeta,
  logo?: string,
  style?: DocStyle
) {
  const accent = style?.accentColor ?? "#111111";
  const fontBody = style?.fontBody ? `"${style.fontBody}", Georgia, serif` : "Georgia, serif";
  const fontHeading = style?.fontHeading ? `"${style.fontHeading}", Arial, sans-serif` : "Arial, sans-serif";
  const bgColor = style?.bgColor ?? "#ffffff";
  const textColor = style?.textColor ?? "#111111";

  const sectionsHtml = sections
    .map((s) => `<h2>${s.heading}</h2><div>${s.content.split("\n").map((l) => (l.trim() ? `<p>${l}</p>` : "<br/>")).join("")}</div>`)
    .join("");

  const logoHtml = logo ? `<img src="${logo}" style="max-height:64px;max-width:200px;object-fit:contain;margin-bottom:1.5em;display:block;" />` : "";

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Proposta — ${meta.clienteNome}</title>
<style>
  body{font-family:${fontBody};margin:3cm 2.5cm;color:${textColor};background:${bgColor};line-height:1.75;font-size:11pt}
  h1{text-align:center;font-size:20pt;letter-spacing:.08em;font-weight:700;margin:0 0 1em;font-family:${fontHeading};color:${accent}}
  h2{font-size:11pt;font-weight:700;border-bottom:1px solid ${accent}44;padding-bottom:.3em;margin:2em 0 .6em;text-transform:uppercase;letter-spacing:.04em;font-family:${fontHeading};color:${accent}}
  p{margin:.4em 0}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:1em;font-size:9pt;margin:.5em 0 1.5em;border:1px solid ${accent}33;padding:.8em 1em;border-radius:4px}
  .meta-item span{display:block;color:${accent};font-size:8pt;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2em;font-family:${fontHeading}}
  hr{border:none;border-top:2px solid ${accent};margin:0 0 1.5em}
  @page{margin:2cm}
</style></head><body>
${logoHtml}
<h1>PROPOSTA COMERCIAL</h1>
<div class="meta">
  <div class="meta-item"><span>Para</span>${meta.clienteNome}</div>
  <div class="meta-item"><span>Serviço</span>${meta.servicoPrincipal}</div>
  <div class="meta-item"><span>Valor</span>${meta.valorTotal}</div>
  <div class="meta-item"><span>Data</span>${new Date().toLocaleDateString("pt-BR")}</div>
</div>
<hr/>
${sectionsHtml}
</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}
