using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class PatchTheory
{
    public static IEnumerable<object[]> ViolationData() =>
        PatchCases.Violations.Select(v => new object[] { v.Case.Name, v.ExpectedRule });

    public static IEnumerable<object[]> CleanData() => PatchCases.CleanVariations.Select(v => new object[] { v.Name });

    [Theory]
    [MemberData(nameof(ViolationData))]
    public void ViolationCase_FiresExpectedRule(string name, string expectedRule)
    {
        var dir = BaselineApp.Load(PatchCases.ByName(name));
        var app = AppConfigEngine.Open(dir).Build();
        var report = ValidationEngine.Run(app);
        Assert.Contains(report.Findings, f => f.RuleId == expectedRule);
    }

    [Theory]
    [MemberData(nameof(CleanData))]
    public void CleanVariation_ProducesNoErrors(string name)
    {
        var dir = BaselineApp.Load(PatchCases.ByName(name));
        var app = AppConfigEngine.Open(dir).Build();
        var report = ValidationEngine.Run(app);
        Assert.False(
            report.HasErrors(),
            $"clean-variation {name} should not produce error-severity findings; got: {string.Join("\n", report.Findings.Where(f => f.Severity == Severity.Error).Select(f => f.ToString()))}"
        );
    }
}
