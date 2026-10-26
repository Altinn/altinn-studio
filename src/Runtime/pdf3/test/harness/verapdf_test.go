package harness

import (
	"strings"
	"testing"
)

func TestNormalizeVeraPDFXML_SortsRules(t *testing.T) {
	ruleA := `<rule specification="ISO 19005-2:2011" clause="6.1.3" testNumber="1" status="failed" failedChecks="1">
            <check status="failed"><context>root</context></check>
          </rule>`
	ruleB := `<rule specification="ISO 19005-2:2011" clause="6.2.4.3" testNumber="2" status="failed" failedChecks="2">
            <check status="failed"><context>root/document[0]/operators[3]</context></check>
            <check status="failed"><context>root/document[0]/operators[10]</context></check>
          </rule>`
	ruleC := `<rule specification="ISO 19005-2:2011" clause="6.6.2.1" testNumber="1" status="failed" failedChecks="1">
            <check status="failed"><context>root/document[0]</context></check>
          </rule>`
	report := func(rules ...string) string {
		return `<report>
  <jobs>
    <job>
      <validationReport isCompliant="false">
        <details passedRules="141" failedRules="3">
          ` + strings.Join(rules, "\n          ") + `
        </details>
      </validationReport>
      <duration start="1761200000000" finish="1761200001234">00:00:01.234</duration>
    </job>
  </jobs>
</report>
`
	}

	want := `<report>
  <jobs>
    <job>
      <validationReport isCompliant="false">
        <details passedRules="141" failedRules="3">
          ` + ruleA + `
          ` + ruleB + `
          ` + ruleC + `
        </details>
      </validationReport>
      <duration start="0" finish="0">00:00:00.000</duration>
    </job>
  </jobs>
</report>
`
	for _, input := range []string{
		report(ruleA, ruleB, ruleC),
		report(ruleB, ruleC, ruleA),
		report(ruleC, ruleA, ruleB),
	} {
		if got := NormalizeVeraPDFXML(input); got != want {
			t.Errorf("NormalizeVeraPDFXML() =\n%s\nwant\n%s", got, want)
		}
	}
}

func TestNormalizeVeraPDFXML_CompliantReport(t *testing.T) {
	input := `<details passedRules="144" failedRules="0" passedChecks="2446" failedChecks="0"></details>`
	if got := NormalizeVeraPDFXML(input); got != input {
		t.Errorf("NormalizeVeraPDFXML() = %q, want %q", got, input)
	}
}
