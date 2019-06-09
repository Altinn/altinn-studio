package altinn.platform.pdf;

import altinn.platform.pdf.models.FormLayout;
import altinn.platform.pdf.models.FormLayoutElement;
import com.google.gson.Gson;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1CFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import sun.reflect.generics.reflectiveObjects.NotImplementedException;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;

/**
 * Hello Altinn! *
 */
public class App {
  public static void main(String[] args) throws IOException {
    // Args
    // 0: File output filename
    // 1: FormLayoutJSON path
    generatePDF(readFormLayout());
    /*
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
    */
  }

  private static FormLayout readFormLayout() throws FileNotFoundException {
    Gson gson = new Gson();
    FileReader fr = new FileReader("formLayout.json");
    FormLayout formLayout = gson.fromJson(fr, FormLayout.class);
    for (FormLayoutElement layoutElement : formLayout.data.layout) {
      System.out.println(layoutElement.type);
    }
    return formLayout;
  }

  private static void generatePDFLayout(FormLayout formLayout) {
    throw new NotImplementedException();
  }

  private static void generatePDF(FormLayout formLayout) {
    
  }
}
