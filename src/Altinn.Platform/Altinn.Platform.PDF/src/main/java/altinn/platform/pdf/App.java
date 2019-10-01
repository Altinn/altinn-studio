package altinn.platform.pdf;

import java.io.IOException;

public class App {
  public static void main(String[] args) {
    String pdfOutput = "test.pdf";
    String pdfLayoutOutput = "pdfLayout.json";
    String formLayoutInput = "formLayout.json";

    try {
      AltinnPDFGenerator generator = new AltinnPDFGenerator();
      generator.generatePDF(pdfOutput);

    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}

