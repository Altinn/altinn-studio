package pdfa

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/devenv/pkg/projectroot"
	pdfaconverter "altinn.studio/pdf3/internal/pdfa"
	"altinn.studio/pdf3/test/harness"
)

func TestConvertFixturePDFToPDFA(t *testing.T) {
	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		t.Fatalf("find project root: %v", err)
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
