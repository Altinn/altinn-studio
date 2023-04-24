package altinn.platform.pdf.controllers;

import altinn.platform.pdf.models.PdfContext;
import altinn.platform.pdf.services.BasicLogger;
import altinn.platform.pdf.services.PDFGenerator;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.logging.Level;


@RestController
public class PDFController {

  @PostMapping("api/v1/generate")
  @Operation(summary = "Generates a receipt pdf")
  public void generate(HttpServletRequest request, HttpServletResponse response, @RequestBody @Valid PdfContext pdfContext) {
    PDFGenerator generator = new PDFGenerator(pdfContext);
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
