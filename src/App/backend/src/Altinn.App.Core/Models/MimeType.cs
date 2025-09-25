using System.Collections;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Models;

/// <summary>
/// MimeType class for handling mime types and aliases
/// </summary>
public class MimeType
{
    /// <summary>
    /// The mime type
    /// </summary>
    public string Type { get; }

    /// <summary>
    /// The aliases for the mime type
    /// </summary>
    public IEnumerable<string> Aliases { get; }

    /// <summary>
    /// Create a new instance of <see cref="MimeType"/>
    /// </summary>
    /// <param name="type">The mime type</param>
    /// <param name="aliases">The aliases for the mime type</param>
    public MimeType(string type, params string[] aliases)
    {
        Type = type;
        Aliases = aliases;
    }

    /// <summary>
    /// Check if the mime type matches the given string
    /// </summary>
    /// <param name="mimeType">String representation of the mime type</param>
    /// <param name="comparisonType"><see cref="StringComparison"/> to use for checking equality to type. Default: <see cref="StringComparison.InvariantCultureIgnoreCase"/></param>
    /// <param name="comparer"><see cref="IEqualityComparer"/> to use for checking equality to aliases. Default: <see cref="StringComparer.InvariantCultureIgnoreCase"/></param>
    /// <returns>true if type or any aliases matches the string in mimeType</returns>
    public bool IsMatch(
        string mimeType,
        StringComparison comparisonType = StringComparison.InvariantCultureIgnoreCase,
        IEqualityComparer<string>? comparer = null
    )
    {
        if (Type.Equals(mimeType, comparisonType))
        {
            return true;
        }

        return Aliases.Contains(mimeType, comparer ?? StringComparer.InvariantCultureIgnoreCase);
    }

    /// <summary>
    /// Returns the string representation of the mime type
    /// </summary>
    /// <returns></returns>
    public override string ToString()
    {
        return Type;
    }

    /// <summary>
    /// Check if the mime type matches the given <see cref="MimeType"/> object
    /// </summary>
    /// <param name="other"></param>
    /// <returns></returns>
    private bool MimeTypeEquals(MimeType? other)
    {
        return other != null && Type == other.Type && Aliases.SequenceEqual(other.Aliases);
    }

    /// <summary>
    /// Check if the mime type matches the given object
    /// Supported types are:
    /// <see cref="string"/>
    /// <see cref="StringValues"/>
    /// <see cref="MimeType"/>
    /// </summary>
    /// <param name="obj">The object to check for equality against. See list of supported types</param>
    /// <param name="comparisonType"><see cref="StringComparison"/> to use for checking equality to type. Default: <see cref="StringComparison.InvariantCultureIgnoreCase"/></param>
    /// <param name="comparer"><see cref="IEqualityComparer"/> to use for checking equality to aliases. Default: <see cref="StringComparer.InvariantCultureIgnoreCase"/></param>
    /// <returns>true if type or any aliases matches</returns>
    public bool Equals(
        object? obj,
        StringComparison comparisonType = StringComparison.InvariantCultureIgnoreCase,
        IEqualityComparer<string>? comparer = null
    )
    {
        if (obj is null)
            return false;

        return obj switch
        {
            string s => IsMatch(s, comparisonType, comparer),
            StringValues s => IsMatch(s.ToString(), comparisonType, comparer),
            MimeType m => MimeTypeEquals(m),
            _ => false,
        };
    }
}
