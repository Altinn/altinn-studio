using System.Xml.Linq;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The environments an app is deployed to, and the names an <c>env</c> attribute in process.bpmn can give them.
/// Copied from <c>AltinnEnvironments</c> in Altinn.App.Core, which the analyzer cannot reference, and pinned to it by
/// <c>HostingEnvironmentsTests</c>.
/// </summary>
internal static class HostingEnvironments
{
    internal const string Development = nameof(Development);
    internal const string Staging = nameof(Staging);
    internal const string Production = nameof(Production);

    /// <summary>The attribute that names the environment an entry applies in: unqualified, as the runtime binds it.</summary>
    internal static readonly XName EnvAttribute = "env";

    /// <summary>The environments, in the order messages name them.</summary>
    internal static readonly ImmutableArray<string> All = [Development, Staging, Production];

    /// <summary>The lowercase names that map to each environment.</summary>
    internal static readonly ImmutableDictionary<string, ImmutableArray<string>> Names = new Dictionary<
        string,
        ImmutableArray<string>
    >
    {
        [Development] = ["development", "dev", "local", "localtest"],
        [Staging] = ["staging", "test", "at22", "at23", "at24", "tt02", "yt01"],
        [Production] = ["production", "prod", "produksjon"],
    }.ToImmutableDictionary();

    private static readonly ImmutableDictionary<string, string> _environmentByName = Names
        .SelectMany(pair => pair.Value.Select(name => (Name: name, Environment: pair.Key)))
        .ToImmutableDictionary(pair => pair.Name, pair => pair.Environment, StringComparer.Ordinal);

    /// <summary>
    /// The first attribute on <paramref name="element"/> named env in any case or namespace, or null when there is
    /// none or its value is blank.
    /// </summary>
    internal static XAttribute? FindEnvLike(XElement element) =>
        element
            .Attributes()
            .FirstOrDefault(a =>
                !a.IsNamespaceDeclaration
                && string.Equals(a.Name.LocalName, EnvAttribute.LocalName, StringComparison.OrdinalIgnoreCase)
            )
            is { } attribute
        && !string.IsNullOrWhiteSpace(attribute.Value)
            ? attribute
            : null;

    /// <summary>
    /// The environment <paramref name="name"/> maps to, ignoring case but not surrounding whitespace, like the runtime;
    /// null for a name it maps to none of them (<c>HostingEnvironment.Unknown</c>).
    /// </summary>
    internal static string? Map(string name) =>
        _environmentByName.TryGetValue(name.ToLowerInvariant(), out var environment) ? environment : null;

    /// <summary>
    /// The entry that applies in <paramref name="environment"/>, as <c>AltinnTaskExtension.GetConfigForEnvironment</c>
    /// picks it: the last entry whose <c>env</c> names the environment, otherwise the last entry without one. An entry
    /// is picked before its value is looked at, so an empty one for the environment hides one without <c>env</c>.
    /// </summary>
    internal static XElement? Resolve(IEnumerable<XElement> entries, string environment)
    {
        XElement? specific = null;
        XElement? global = null;
        foreach (var entry in entries)
        {
            var env = entry.Attribute(EnvAttribute)?.Value;
            if (env is null || string.IsNullOrWhiteSpace(env))
            {
                global = entry;
            }
            else if (Map(env) == environment)
            {
                specific = entry;
            }
        }

        return specific ?? global;
    }
}
