package altinn.platform.pdf;

import altinn.platform.pdf.models.PDFLayout;

import java.io.IOException;

public class App {
  public static void main(String[] args) {
    String pdfOutput = "test.pdf";
    String pdfLayoutOutput = "pdfLayout.json";
    String formLayoutInput = "formLayout.json";

    // TODO: Use args for hardcoded values

    try {
      AltinnPDFGenerator generator = new AltinnPDFGenerator();
      //PDFLayout pdfLayout = generator.generatePDFLayout(pdfLayoutOutput, formLayoutInput);
      PDFLayout pdfLayout = generator.readPDFLayout(pdfLayoutOutput);
      generator.generatePDF(pdfLayout, pdfOutput);

    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}

