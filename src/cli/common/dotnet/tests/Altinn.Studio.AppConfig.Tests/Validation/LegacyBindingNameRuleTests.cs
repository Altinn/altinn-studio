using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class LegacyBindingNameRuleTests
{
    private const string Rule = "LEGACY-BINDING-NAME";

    private static InMemoryAppDirectory App(string components) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/legacy", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] = $$"""{ "data": { "layout": [ {{components}} ] } }""",
                ["App/models/model.schema.json"] = """
                {"properties":{"ssn":{"type":"string"},"orgnr":{"type":"string"},"rows":{"type":"array","items":{"type":"object","properties":{"a":{"type":"string"}}}}}}
                """,
            }
        );

    [Fact]
    public void PersonLookup_SnakeCaseBinding_Fires()
    {
        var report = AppConfigEngine
            .Open(App("""{ "id": "p", "type": "PersonLookup", "dataModelBindings": { "person_lookup_ssn": "ssn" } }"""))
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("\"ssn\"", finding.Message);
        Assert.Equal("/data/layout/0/dataModelBindings/person_lookup_ssn", finding.Position.Pointer);
    }

    [Fact]
    public void OrganizationLookup_EitherLegacySpelling_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "id": "o1", "type": "OrganizationLookup", "dataModelBindings": { "organization_lookup_orgnr": "orgnr" } },
                    { "id": "o2", "type": "OrganisationLookup", "dataModelBindings": { "organisation_lookup_orgnr": "orgnr" } }
                    """
                )
            )
            .Validate();

        Assert.Equal(2, report.Findings.Count(f => f.RuleId == Rule));
    }

    [Fact]
    public void RepeatingGroup_SnakeCaseTextBinding_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "rows" }, "textResourceBindings": { "add_button": "add" }, "children": ["a"] },
                    { "id": "a", "type": "Input", "dataModelBindings": { "simpleBinding": "rows.a" } }
                    """
                )
            )
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("addButton", finding.Message);
    }

    [Fact]
    public void CamelCaseBindings_AreClean()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "id": "p", "type": "PersonLookup", "dataModelBindings": { "ssn": "ssn" } },
                    { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "rows" }, "textResourceBindings": { "addButton": "add" }, "children": ["a"] },
                    { "id": "a", "type": "Input", "dataModelBindings": { "simpleBinding": "rows.a" }, "textResourceBindings": { "add_button": "irrelevant" } }
                    """
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }
}
