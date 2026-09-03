using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation;

public static class ValidationEngine
{
    public static IReadOnlyList<IValidationRule> AllRules => RuleRegistry.All();

    public static ValidationReport Run(AppModel app)
    {
        var rules = app.UnsupportedAppVersion is null
            ? AllRules
            : AllRules.Where(r => r.Metadata.Id == Rules.Meta.AppVersionSupportedRule.RuleId).ToList();
        var findings = new List<Finding>();
        foreach (var rule in rules)
        {
            try
            {
                foreach (var f in rule.Check(app))
                {
                    findings.Add(ApplyDefaultSeverity(rule.Metadata, f));
                }
            }
            catch (Exception ex)
            {
                findings.Add(
                    new Finding(
                        rule.Metadata.Id,
                        $"rule failed to run: {ex.Message}",
                        Severity.Error,
                        new SourceSpan("", "")
                    )
                );
            }
        }
        return new ValidationReport(app, Normalize(findings), rules.Count);
    }

    internal static List<Finding> Normalize(List<Finding> findings)
    {
        var deduped = findings.Distinct().ToList();
        deduped.Sort(FindingComparer.Instance);
        return deduped;
    }

    internal static Finding ApplyDefaultSeverity(RuleMetadata rule, Finding f) =>
        f.Severity == Severity.None ? f with { Severity = rule.DefaultSeverity } : f;

    private sealed class FindingComparer : IComparer<Finding>
    {
        public static readonly FindingComparer Instance = new();

        public int Compare(Finding? x, Finding? y)
        {
            if (x is null || y is null)
                return 0;
            var c = string.CompareOrdinal(x.RuleId, y.RuleId);
            if (c != 0)
                return c;
            c = string.CompareOrdinal(x.Position.File, y.Position.File);
            if (c != 0)
                return c;
            c = string.CompareOrdinal(x.Position.Pointer, y.Position.Pointer);
            if (c != 0)
                return c;
            return string.CompareOrdinal(x.Message, y.Message);
        }
    }
}

public sealed class ValidationReport
{
    public AppModel App { get; }
    public IReadOnlyList<Finding> Findings { get; }

    public int RulesRun { get; }

    public ValidationReport(AppModel app, IReadOnlyList<Finding> findings, int rulesRun)
    {
        App = app;
        Findings = findings;
        RulesRun = rulesRun;
    }

    public bool HasErrors()
    {
        foreach (var f in Findings)
            if (f.Severity == Severity.Error)
                return true;
        return false;
    }

    public ValidationReport Filter(Severity minUrgency)
    {
        var kept = new List<Finding>();
        foreach (var f in Findings)
        {
            if ((int)f.Severity <= (int)minUrgency)
                kept.Add(f);
        }
        return new ValidationReport(App, kept, RulesRun);
    }

    public ValidationSummary Summary()
    {
        int errors = 0,
            warnings = 0,
            info = 0;
        foreach (var f in Findings)
        {
            switch (f.Severity)
            {
                case Severity.Error:
                    errors++;
                    break;
                case Severity.Warning:
                    warnings++;
                    break;
                case Severity.Info:
                    info++;
                    break;
            }
        }
        return new ValidationSummary(errors, warnings, info, RulesRun);
    }
}

public sealed record ValidationSummary(int Errors, int Warnings, int Info, int RulesRun);
