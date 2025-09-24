import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with matching version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ExtractedContent {
  text: string;
  pageCount: number;
  hasImages: boolean;
}

export class PDFExtractor {
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly MIN_TEXT_LENGTH = 10;

  static async extractText(file: File): Promise<ExtractedContent> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 20MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        // Add these options for better compatibility
        verbosity: 0,
        isEvalSupported: false,
        disableFontFace: false,
        useSystemFonts: true
      });
      
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      let hasImages = false;
      const pageCount = pdf.numPages;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          
          // Get text content with better options
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => {
              // Handle different item types
              if (item.str) {
                return item.str;
              }
              return '';
            })
            .filter(text => text.trim().length > 0)
            .join(' ');

          if (pageText.trim()) {
            fullText += pageText + '\n';
          }

          // Check for images (for potential OCR)
          try {
            const operatorList = await page.getOperatorList();
            if (operatorList.fnArray.some((fn: number) => fn === pdfjsLib.OPS.paintImageXObject)) {
              hasImages = true;
            }
          } catch (opError) {
            // Continue if operator list fails
            console.warn(`Could not check for images on page ${pageNum}`);
          }

        } catch (pageError) {
          console.warn(`Error processing page ${pageNum}:`, pageError);
          continue;
        }
      }

      // Clean and normalize text
      const cleanedText = this.cleanText(fullText);

      // If no text extracted and has images, suggest OCR
      if (cleanedText.length < this.MIN_TEXT_LENGTH && hasImages) {
        throw new Error('This PDF appears to contain scanned images. Text extraction failed. The document may need OCR processing.');
      }

      if (cleanedText.length < this.MIN_TEXT_LENGTH) {
        throw new Error('No readable text found in this PDF. The document may be corrupted or contain only images.');
      }

      return {
        text: cleanedText,
        pageCount,
        hasImages
      };

    } catch (error) {
      if (error instanceof Error) {
        // Handle specific PDF.js errors
        if (error.message.includes('Invalid PDF structure')) {
          throw new Error('Invalid PDF file. The file may be corrupted.');
        }
        if (error.message.includes('Password')) {
          throw new Error('This PDF is password-protected. Please provide an unlocked version.');
        }
        throw error;
      }
      throw new Error('Failed to process PDF. The file may be corrupted or in an unsupported format.');
    }
  }

  private static cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters but keep basic punctuation
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove weird Unicode characters that cause display issues
      .replace(/[\uFFF0-\uFFFF]/g, '')
      // Remove PDF-specific artifacts
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Clean up font encoding issues
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
      // Remove excessive special characters
      .replace(/[^\w\s.,!?;:()"'\-]/g, ' ')
      // Clean up multiple spaces again
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim();
  }

  static async extractFromTXT(file: File): Promise<string> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 20MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }

    const text = await file.text();
    const cleanedText = this.cleanText(text);

    if (cleanedText.length < this.MIN_TEXT_LENGTH) {
      throw new Error('Text file is too short or contains no readable content.');
    }

    return cleanedText;
  }
}