using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RuleRegistryTests
{
    private const string SchemaRuleId = "JSONSCHEMA-VALID";

    private static readonly SchemaSet _metadataRejectingSchemas = SchemaSet.FromFiles(
        new Dictionary<string, string>
        {
            ["application/application-metadata.schema.v1.json"] = """{"required":["schemaProbe"]}""",
        }
    );

    [Fact]
    public void Registry_ConstructsEveryRuleClassInTheAssembly()
    {
        var ruleClasses = typeof(ValidationEngine)
            .Assembly.GetTypes()
            .Where(t => !t.IsAbstract && !t.IsInterface && typeof(IValidationRule).IsAssignableFrom(t))
            .Select(t => t.FullName)
            .OrderBy(n => n, StringComparer.Ordinal);

        var registered = ValidationEngine
            .AllRules.Select(r => r.GetType().FullName)
            .OrderBy(n => n, StringComparer.Ordinal);

        Assert.Equal(ruleClasses, registered);
    }

    [Fact]
    public void Registry_RuleIdsAreUniqueAndSorted()
    {
        var ids = ValidationEngine.AllRules.Select(r => r.Metadata.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
        Assert.Equal(ids, ids.OrderBy(x => x, StringComparer.Ordinal));
    }

    [Fact]
    public void RuleMetadata_ListsEveryRuleAndSchemaValidationSorted()
    {
        var expected = ValidationEngine
            .AllRules.Select(r => r.Metadata.Id)
            .Append(SchemaRuleId)
            .OrderBy(x => x, StringComparer.Ordinal);

        Assert.Equal(expected, ValidationEngine.AllRuleMetadata.Select(m => m.Id));
    }

    public static IEnumerable<object[]> PatchCaseNames() =>
        PatchCases
            .Violations.Select(v => v.Case)
            .Concat(PatchCases.CleanVariations)
            .Select(c => new object[] { c.Name });

    [Theory]
    [MemberData(nameof(PatchCaseNames))]
    public void EveryReportedRuleId_HasRuleMetadata(string name)
    {
        var engine = AppConfigEngine.Open(BaselineApp.Load(PatchCases.ByName(name)));

        var report = engine.ValidateAll(_metadataRejectingSchemas);

        var described = ValidationEngine.AllRuleMetadata.Select(m => m.Id).ToHashSet(StringComparer.Ordinal);
        Assert.Contains(report.Findings, f => f.RuleId == SchemaRuleId);
        Assert.All(report.Findings, f => Assert.Contains(f.RuleId, described));
    }

    [Fact]
    public void SchemaValidation_StaysOutsideTheRuleRunAndReportsErrors()
    {
        var engine = AppConfigEngine.Open(BaselineApp.Load());

        var rules = engine.Validate();
        var all = engine.ValidateAll(_metadataRejectingSchemas);

        Assert.DoesNotContain(rules.Findings, f => f.RuleId == SchemaRuleId);
        Assert.Equal(ValidationEngine.AllRules.Count, all.RulesRun);
        var schemaFinding = Assert.Single(all.Findings, f => f.RuleId == SchemaRuleId);
        Assert.Equal(Severity.Error, schemaFinding.Severity);
    }
}
