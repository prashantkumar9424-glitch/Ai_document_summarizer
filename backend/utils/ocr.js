import Tesseract from "tesseract.js";

export async function ocrImage(imagePath) {
  try {
    const options = {};
    
    // Only add logger if logging is explicitly enabled
    if (process.env.OCR_LOGS === "true") {
      options.logger = (message) => console.log(message);
    }

    const result = await Tesseract.recognize(imagePath, "eng", options);

    return result.data?.text?.trim() || "";

  } catch (error) {
    console.error("OCR error:", error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}
