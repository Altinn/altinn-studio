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
