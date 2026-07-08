using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RuleRegistryTests
{
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
        Assert.Equal(ids.Count(), ids.Distinct().Count());
        Assert.Equal(ids, ids.OrderBy(x => x, StringComparer.Ordinal));
    }
}
