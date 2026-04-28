import AdmZip from "adm-zip";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

function stripXmlTags(input: string) {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripRtfMarkup(input: string) {
  return input
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPptxText(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip
    .getEntries()
    .filter((entry) => entry.entryName.startsWith("ppt/slides/slide") && entry.entryName.endsWith(".xml"));

  return entries
    .map((entry) => stripXmlTags(entry.getData().toString("utf8")))
    .filter(Boolean)
    .join("\n\n");
}

function extractXlsxText(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((entry) => {
    return (
      (entry.entryName.startsWith("xl/worksheets/sheet") && entry.entryName.endsWith(".xml")) ||
      entry.entryName === "xl/sharedStrings.xml"
    );
  });

  return entries
    .map((entry) => stripXmlTags(entry.getData().toString("utf8")))
    .filter(Boolean)
    .join("\n\n");
}

function extractStructuredText(buffer: Buffer, extension: string) {
  const text = buffer.toString("utf8").trim();
  if (!text) {
    return "";
  }

  if (extension === "json") {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  if (["html", "htm", "xml", "svg"].includes(extension)) {
    return stripXmlTags(text);
  }

  if (extension === "rtf") {
    return stripRtfMarkup(text);
  }

  return text;
}

export async function extractTextFromDocument(fileName: string, mimeType: string, buffer: Buffer) {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";

  if (mimeType.includes("pdf") || extension === "pdf") {
    const pdf = await pdfParse(buffer);
    return pdf.text.trim();
  }

  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    extension === "docx" ||
    extension === "doc"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (
    mimeType.includes("presentationml") ||
    mimeType.includes("powerpoint") ||
    extension === "pptx" ||
    extension === "ppt"
  ) {
    return extractPptxText(buffer);
  }

  if (mimeType.includes("spreadsheetml") || mimeType.includes("excel") || extension === "xlsx") {
    return extractXlsxText(buffer);
  }

  if (mimeType.startsWith("text/") || ["txt", "md", "json", "csv", "html", "htm", "xml", "svg", "rtf"].includes(extension)) {
    return extractStructuredText(buffer, extension);
  }

  return "";
}
