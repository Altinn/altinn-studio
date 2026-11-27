using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Common.Cdn;

/// <summary>
/// The environment registry that Altinn's CDN publishes as <c>environments.json</c>, read from a copy of that document.
/// It does not fetch the document. Whoever does decides where from and for how long a copy is good.
/// </summary>
/// <remarks>
/// A service owner's apps are served at a host made of the service owner code, the environment's app prefix and its
/// host name, by a pattern such as <see cref="DefaultAppsHostPattern"/>, which Designer configures the same way. It
/// reads what it can and says what it left out, in <see cref="Skipped"/>, so that one bad entry does not take the
/// other environments with it and does not go unnoticed either.
/// </remarks>
public sealed class AltinnEnvironmentsRegistry : EnvironmentRegistry
{
    /// <summary>
    /// How a host that serves a service owner's apps is made: <c>{org}</c> is the service owner code, and
    /// <c>{appPrefix}</c> and <c>{hostname}</c> are the environment's, such as <c>ttd.apps.tt02.altinn.no</c>.
    /// </summary>
    public const string DefaultAppsHostPattern = "{org}.{appPrefix}.{hostname}";

    private readonly Dictionary<RuntimeEnvironment, (string Hostname, string AppPrefix)> _environments;
    private readonly string _appsHostPattern;

    private AltinnEnvironmentsRegistry(
        Dictionary<RuntimeEnvironment, (string Hostname, string AppPrefix)> environments,
        IReadOnlyList<string> skipped,
        string appsHostPattern
    )
    {
        _environments = environments;
        Skipped = skipped;
        _appsHostPattern = appsHostPattern;
        Environments = [.. environments.Keys];
    }

    /// <summary>Every environment in the document.</summary>
    public IReadOnlyCollection<RuntimeEnvironment> Environments { get; }

    /// <summary>
    /// The entries that were left out, as their name or their raw JSON: one whose name is not an environment's, one
    /// without a host name or app prefix that a host name can be made of, and one that names an environment again.
    /// </summary>
    public IReadOnlyList<string> Skipped { get; }

    /// <summary>Reads the document, with <see cref="DefaultAppsHostPattern"/>.</summary>
    public static bool TryParse(
        ReadOnlyMemory<byte> json,
        [NotNullWhen(true)] out AltinnEnvironmentsRegistry? registry
    ) => TryParse(json, DefaultAppsHostPattern, out registry);

    /// <summary>
    /// Reads the document: an object with <c>environments</c>, an array of objects with a <c>name</c>, a
    /// <c>hostname</c> and an <c>appPrefix</c>.
    /// </summary>
    /// <param name="json">The document.</param>
    /// <param name="appsHostPattern">How a host that serves apps is made. See <see cref="DefaultAppsHostPattern"/>.</param>
    /// <param name="registry">The registry, when the document is one.</param>
    public static bool TryParse(
        ReadOnlyMemory<byte> json,
        string appsHostPattern,
        [NotNullWhen(true)] out AltinnEnvironmentsRegistry? registry
    )
    {
        registry = null;
        try
        {
            using JsonDocument document = JsonDocument.Parse(json);
            if (
                document.RootElement.ValueKind != JsonValueKind.Object
                || !document.RootElement.TryGetProperty("environments", out JsonElement entries)
                || entries.ValueKind != JsonValueKind.Array
            )
            {
                return false;
            }

            var environments = new Dictionary<RuntimeEnvironment, (string Hostname, string AppPrefix)>();
            var skipped = new List<string>();
            foreach (JsonElement entry in entries.EnumerateArray())
            {
                string? name = Text(entry, "name");
                string? hostname = Text(entry, "hostname");
                string? appPrefix = Text(entry, "appPrefix");
                if (
                    RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment)
                    && IsHostName(hostname)
                    && IsHostName(appPrefix)
                    && !environments.ContainsKey(environment)
                )
                {
                    environments[environment] = (hostname, appPrefix);
                }
                else
                {
                    skipped.Add(name ?? entry.GetRawText());
                }
            }

            registry = new AltinnEnvironmentsRegistry(environments, skipped, appsHostPattern);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>
    /// The host name that serves a service owner's apps in an environment, without waiting, since the document is
    /// already read.
    /// </summary>
    public bool TryGetAppsHost(
        ServiceOwnerCode org,
        RuntimeEnvironment environment,
        [NotNullWhen(true)] out string? host
    )
    {
        host = null;
        if (!_environments.TryGetValue(environment, out (string Hostname, string AppPrefix) entry))
        {
            return false;
        }

        host = _appsHostPattern
            .Replace("{org}", org.Value, StringComparison.Ordinal)
            .Replace("{appPrefix}", entry.AppPrefix, StringComparison.Ordinal)
            .Replace("{hostname}", entry.Hostname, StringComparison.Ordinal);
        return true;
    }

    /// <inheritdoc />
    public override Task<IReadOnlyCollection<RuntimeEnvironment>> List(CancellationToken cancellationToken) =>
        Task.FromResult(Environments);

    /// <inheritdoc />
    public override Task<string?> AppsHost(
        ServiceOwnerCode org,
        RuntimeEnvironment environment,
        CancellationToken cancellationToken
    ) => Task.FromResult(TryGetAppsHost(org, environment, out string? host) ? host : null);

    private static string? Text(JsonElement entry, string property) =>
        entry.ValueKind == JsonValueKind.Object
        && entry.TryGetProperty(property, out JsonElement value)
        && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    // Labels of lower-case letters, digits and hyphens, separated by dots, as the registry writes host names, so that
    // what the pattern makes of them stays a host name.
    private static bool IsHostName([NotNullWhen(true)] string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return false;
        }

        foreach (string label in value.Split('.'))
        {
            if (label.Length == 0 || label[0] == '-' || label[label.Length - 1] == '-')
            {
                return false;
            }

            foreach (char c in label)
            {
                if (!AsciiText.IsLower(c) && !AsciiText.IsDigit(c) && c != '-')
                {
                    return false;
                }
            }
        }

        return true;
    }
}
