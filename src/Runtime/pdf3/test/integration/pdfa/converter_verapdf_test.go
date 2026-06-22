package pdfa

import (
	"os"
	"path/filepath"
	"testing"

	pdfaconverter "altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/test/harness"
)

func TestConvertFixturePDFToPDFA(t *testing.T) {
	projectRoot, err := harness.FindProjectRoot()
	if err != nil {
		t.Fatalf("FindProjectRoot() error = %v", err)
	}
	inputPath := filepath.Join(projectRoot, "internal", "pdfa", "testdata", "pdfa-conversion-input.pdf")
	input, err := os.ReadFile(inputPath)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}

	converter := pdfaconverter.NewConverter()
	output, err := converter.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	result := harness.ValidatePDFWithVeraPDF(t, output)
	report := harness.NormalizeVeraPDFXML(result.Stdout)
	harness.Snapshot(t, []byte(report), "verapdf", "xml")
}
