package altinn.platform.pdf.controllers;

import altinn.platform.pdf.AltinnPDFGenerator;
import altinn.platform.pdf.models.PdfContext;
import altinn.platform.pdf.services.BasicLogger;
import io.swagger.annotations.ApiOperation;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.logging.Level;


@RestController
public class PDFController {

  @PostMapping("pdf/api/v1/generate")
  @ApiOperation(value = "Generates a receipt pdf")
  public void generate(HttpServletRequest request, HttpServletResponse response, @RequestBody PdfContext pdfContext) {
    AltinnPDFGenerator generator = new AltinnPDFGenerator(pdfContext);
    try {
      ByteArrayOutputStream output = generator.generatePDF();
      response.addHeader("Content-Type", "application/pdf");
      response.addHeader("Content-Disposition", "attachment; filename=receipt.pdf");
      response.getOutputStream().write(output.toByteArray());
    } catch (IOException e) {
      BasicLogger.log(Level.SEVERE, e.toString());
    }
  }
}
