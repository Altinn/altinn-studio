using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet;

/// <summary>A DNS host name, which is safe to put in a URL.</summary>
public sealed record HostName
{
    private const int MaxLength = 253;
    private const int MaxLabelLength = 63;

    private HostName(string value)
    {
        Value = value;
    }

    /// <summary>The host name, such as <c>altinn.studio</c>.</summary>
    public string Value { get; }

    /// <summary>
    /// Parses labels of letters, digits, <c>-</c> and <c>_</c>, separated by dots, that do not start or end with
    /// <c>-</c>.
    /// </summary>
    public static bool TryParse(string? value, [NotNullWhen(true)] out HostName? host)
    {
        host = null;
        if (value is null || value.Length is 0 or > MaxLength)
        {
            return false;
        }

        foreach (string label in value.Split('.'))
        {
            if (label.Length is 0 or > MaxLabelLength || label[0] == '-' || label[^1] == '-')
            {
                return false;
            }

            if (!label.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_'))
            {
                return false;
            }
        }

        host = new HostName(value);
        return true;
    }

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => Value;
}

/// <summary>
/// A host name with <c>{org}</c> for a service owner and, optionally, <c>{env}</c> for an environment, such as
/// <c>{org}.apps.altinn.no</c>.
/// </summary>
public sealed record HostTemplate
{
    private const string OrgPlaceholder = "{org}";
    private const string EnvironmentPlaceholder = "{env}";

    private HostTemplate(string value)
    {
        Value = value;
    }

    /// <summary>The template.</summary>
    public string Value { get; }

    /// <summary>Parses a template that gives a host name for a service owner and an environment.</summary>
    public static bool TryParse(string? value, [NotNullWhen(true)] out HostTemplate? template)
    {
        template =
            value is not null
            && value.Contains(OrgPlaceholder, StringComparison.Ordinal)
            && HostName.TryParse(Fill(value, "ttd", "tt02"), out _)
                ? new HostTemplate(value)
                : null;
        return template is not null;
    }

    /// <summary>Parses a template, or throws.</summary>
    /// <exception cref="ArgumentException">The template gives no host name.</exception>
    public static HostTemplate Parse(string value) =>
        TryParse(value, out HostTemplate? template)
            ? template
            : throw new ArgumentException($"'{value}' is not a host template with {OrgPlaceholder}.", nameof(value));

    /// <summary>The host of a service owner in an environment, or <c>false</c> when its name makes no host name.</summary>
    public bool TryRender(
        ServiceOwnerCode org,
        RuntimeEnvironment environment,
        [NotNullWhen(true)] out HostName? host
    ) => HostName.TryParse(Fill(Value, org.Value, environment.Name), out host);

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => Value;

    private static string Fill(string template, string org, string environment) =>
        template
            .Replace(EnvironmentPlaceholder, environment, StringComparison.Ordinal)
            .Replace(OrgPlaceholder, org, StringComparison.Ordinal);
}
