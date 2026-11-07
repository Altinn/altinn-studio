package simple

import (
	"testing"

	"altinn.studio/common/snapshot"
	"altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

func Test_ConvertGeneratedBasicPDFToPDFA(t *testing.T) {
	assertConvertedGeneratedPDFIsPDFA(t, harness.TestServerURL+"/app/?render=light", nil, true)
}

func Test_ConvertGeneratedTADFormPDFToPDFA(t *testing.T) {
	assertConvertedGeneratedPDFIsPDFA(
		t,
		harness.TestServerURL+"/app/tad/eur1/",
		types.NewWaitForString("#readyForPrint"),
		false,
	)
}

func assertConvertedGeneratedPDFIsPDFA(t *testing.T, url string, waitFor *types.WaitFor, snapshotInput bool) {
	t.Helper()

	req := harness.GetDefaultPdfRequest(t)
	req.URL = url
	req.WaitFor = waitFor

	resp, err := harness.RequestNewPDF(t, req)
	if err != nil {
		t.Fatalf("Failed to generate PDF: %v", err)
	}

	input := harness.MakePdfDeterministic(t, resp.Data)
	if snapshotInput {
		snapshot.Match(t, input, "input", "pdf")
		snapshot.Match(t, input, "input", "txt")

		inputValidation := harness.ValidatePDFWithVeraPDF(t, input)
		inputReport := harness.NormalizeVeraPDFXML(inputValidation.Stdout)
		snapshot.Match(t, []byte(inputReport), "input_verapdf", "xml")
	}

	converter := pdfa.NewConverter()
	output, err := converter.Convert(input)
	if err != nil {
		t.Fatalf("Conversion failed: %v", err)
	}

	snapshot.Match(t, output, "output", "pdf")
	snapshot.Match(t, output, "output", "txt")

	result := harness.ValidatePDFWithVeraPDF(t, output)
	report := harness.NormalizeVeraPDFXML(result.Stdout)
	snapshot.Match(t, []byte(report), "verapdf", "xml")
}
