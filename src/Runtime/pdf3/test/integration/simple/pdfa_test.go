package simple

import (
	"testing"

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
		harness.Snapshot(t, input, "input", "pdf")
		harness.Snapshot(t, input, "input", "txt")

		inputValidation := harness.ValidatePDFWithVeraPDF(t, input)
		inputReport := harness.NormalizeVeraPDFXML(inputValidation.Stdout)
		harness.Snapshot(t, []byte(inputReport), "input_verapdf", "xml")
	}

	converter := pdfa.NewConverter()
	output, err := converter.Convert(input)
	if err != nil {
		t.Fatalf("Conversion failed: %v", err)
	}

	harness.Snapshot(t, output, "output", "pdf")
	harness.Snapshot(t, output, "output", "txt")

	result := harness.ValidatePDFWithVeraPDF(t, output)
	report := harness.NormalizeVeraPDFXML(result.Stdout)
	harness.Snapshot(t, []byte(report), "verapdf", "xml")
}
