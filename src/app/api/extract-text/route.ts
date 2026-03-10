// API route for extracting text from documents
import { NextResponse } from 'next/server';

// Force Node.js runtime (required for Buffer and pdf-parse)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        text: null,
        message: 'No file provided' 
      }, { status: 400 });
    }

    const mimeType = file.type;
    const fileName = file.name.toLowerCase();
    let extractedText = '';

    console.log(`[extract-text] Processing: ${fileName}, type: ${mimeType}, size: ${file.size}`);

    // Extract text based on file type
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF extraction using pdf-parse
      try {
        // Use require to avoid ESM issues with pdf-parse
        const pdfParse = require('pdf-parse');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[extract-text] PDF buffer size: ${buffer.length} bytes`);
        
        const data = await pdfParse(buffer);
        extractedText = data.text.trim();
        
        console.log(`[extract-text] Extracted ${extractedText.length} characters from PDF`);
        
        if (extractedText.length === 0) {
          return NextResponse.json({ 
            success: true, 
            text: null,
            message: 'PDF appears to be image-based (scanned). No text layer found.'
          });
        }
      } catch (pdfError: any) {
        console.error('[extract-text] PDF parsing error:', pdfError);
        return NextResponse.json({ 
          success: true, 
          text: null,
          message: `PDF extraction failed: ${pdfError?.message || 'Unknown error'}`
        });
      }
      
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // Word document extraction
      try {
        const mammoth = require('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[extract-text] Word buffer size: ${buffer.length} bytes`);
        
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
        console.log(`[extract-text] Extracted ${extractedText.length} characters from Word document`);
      } catch (docError: any) {
        console.error('[extract-text] Word parsing error:', docError);
        return NextResponse.json({ 
          success: true, 
          text: null,
          message: `Word extraction failed: ${docError?.message || 'Unknown error'}`
        });
      }
      
    } else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      // Plain text
      extractedText = await file.text();
      console.log(`[extract-text] Read ${extractedText.length} characters from text file`);
      
    } else {
      console.log(`[extract-text] Unsupported file type: ${mimeType}`);
      return NextResponse.json({ 
        success: true, 
        text: null,
        message: 'Unsupported file type for text extraction'
      });
    }

    return NextResponse.json({ 
      success: true, 
      text: extractedText,
      length: extractedText.length
    });

  } catch (error) {
    console.error('[extract-text] Error extracting text:', error);
    return NextResponse.json({ 
      success: false,
      text: null,
      message: error instanceof Error ? error.message : 'Failed to extract text'
    }, { status: 500 });
  }
}
