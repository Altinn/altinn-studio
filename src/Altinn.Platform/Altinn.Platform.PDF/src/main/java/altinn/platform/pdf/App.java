package altinn.platform.pdf;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1CFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.io.IOException;

/**
 * Hello Altinn! *
 */
public class App {
  public static void main(String[] args) throws IOException {
    // Args
    // 0: File output filename
    // 1: FormLayoutJSON path
    PDDocument document = new PDDocument();

    PDPage page = new PDPage();
    document.addPage((page));

    PDFont font = PDType1Font.COURIER;

    PDPageContentStream contentStream = new PDPageContentStream(document, page);

    contentStream.beginText();
    contentStream.setFont(font, 12);
    contentStream.showText("TEST AV TEKST");

    String fileName;
    if (args.length > 0 && args[0] != null && !args[0].isEmpty()) {
      fileName = args[0];
    } else {
      fileName = "test.pdf";
    }
    try {
      document.save(fileName);
      document.close();
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}
