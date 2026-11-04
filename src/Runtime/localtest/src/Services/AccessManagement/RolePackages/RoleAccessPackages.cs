using System.Text.Json;
using System.Text.Json.Serialization;

namespace LocalTest.Services.AccessManagement.RolePackages;

/// <summary>
/// The access packages Access Management derives from a role, generated from its static data into
/// <c>role-packages.json</c> by <c>generate_role_packages.py</c>. A role is found by its code (<c>daglig-leder</c>) or
/// its Altinn 2 code (<c>DAGL</c>), ignoring case.
/// </summary>
public sealed class RoleAccessPackages
{
    private const string ResourceName = "LocalTest.RolePackages.role-packages.json";

    private static readonly Lazy<RoleAccessPackages> _embedded = new(Load);

    private readonly Dictionary<string, RolePackagesEntry> _byCode;

    private RoleAccessPackages(RolePackagesFile file)
    {
        _byCode = file.Roles
            .SelectMany(entry => entry.Codes.Select(code => (Code: code, Entry: entry)))
            .ToDictionary(r => r.Code, r => r.Entry, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>The mapping that ships with Localtest.</summary>
    public static RoleAccessPackages Embedded => _embedded.Value;

    /// <summary>
    /// The packages the role gives for an organization of the unit type (such as <c>AS</c> or <c>VPFO</c>). Some
    /// packages apply only to some unit types, and are left out when the unit type is unknown.
    /// </summary>
    public IEnumerable<string> GetPackages(string roleCode, string? unitType)
    {
        if (!_byCode.TryGetValue(roleCode, out var entry))
        {
            return [];
        }

        var packages = entry.Packages ?? [];
        if (unitType is not null && entry.PackagesByUnitType is not null)
        {
            var forUnitType = entry.PackagesByUnitType
                .Where(byType => string.Equals(byType.Key, unitType, StringComparison.OrdinalIgnoreCase))
                .SelectMany(byType => byType.Value);
            return packages.Concat(forUnitType);
        }

        return packages;
    }

    private static RoleAccessPackages Load()
    {
        using var stream = typeof(RoleAccessPackages).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Missing embedded resource {ResourceName}");
        var file = JsonSerializer.Deserialize<RolePackagesFile>(stream)
            ?? throw new InvalidOperationException($"Empty embedded resource {ResourceName}");
        return new RoleAccessPackages(file);
    }

    private sealed record RolePackagesFile([property: JsonPropertyName("roles")] List<RolePackagesEntry> Roles);

    private sealed record RolePackagesEntry(
        [property: JsonPropertyName("codes")] List<string> Codes,
        [property: JsonPropertyName("packages")] List<string>? Packages,
        [property: JsonPropertyName("packagesByUnitType")] Dictionary<string, List<string>>? PackagesByUnitType
    );
}
