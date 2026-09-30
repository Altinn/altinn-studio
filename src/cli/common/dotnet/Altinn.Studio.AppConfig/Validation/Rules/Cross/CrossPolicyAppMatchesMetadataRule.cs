using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class CrossPolicyAppMatchesMetadataRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-POLICY-APP-MATCHES-METADATA",
            "policy.xml org/app strings must match applicationmetadata.id",
            "Every urn:altinn:org and urn:altinn:app value in policy.xml must match the "
                + "org/app split from applicationmetadata.id. Forgotten-rename mistakes (e.g. "
                + "cloning a template and forgetting to update the policy) are the most common "
                + "cause of 'no one matches the policy' bugs in production.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        if (string.IsNullOrEmpty(app.ApplicationId))
            yield break;
        var match = AppIdConvention.Pattern.Match(app.ApplicationId);
        if (!match.Success)
            yield break; // SHAPE-APP-ID handles the shape problem
        var wantOrg = match.Groups[1].Value;
        var wantApp = match.Groups[2].Value;

        foreach (var p in app.Refs.PolicyOrgApps)
        {
            if (IsPolicyPlaceholder(p.Value))
                continue;
            switch (p.Attribute)
            {
                case "urn:altinn:org":
                    if (!string.Equals(p.Value, wantOrg, StringComparison.OrdinalIgnoreCase))
                    {
                        yield return Metadata.Report(
                            $"policy.xml {p.Attribute} is \"{p.Value}\" but applicationmetadata.id is \"{app.ApplicationId}\" (expected {p.Attribute}=\"{wantOrg}\")",
                            p.Position
                        );
                    }
                    break;
                case "urn:altinn:app":
                    if (!string.Equals(p.Value, wantApp, StringComparison.OrdinalIgnoreCase))
                    {
                        yield return Metadata.Report(
                            $"policy.xml {p.Attribute} is \"{p.Value}\" but applicationmetadata.id is \"{app.ApplicationId}\" (expected {p.Attribute}=\"{wantApp}\")",
                            p.Position
                        );
                    }
                    break;
            }
        }
    }

    private static bool IsPolicyPlaceholder(string v) => v.Length >= 2 && v[0] == '[' && v[^1] == ']';
}
