using System.Text.Json;
using System.Text.Json.Serialization;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.AccessManagement.RolePackages;

/// <summary>
/// The access packages Access Management derives from a role, generated from its static data into
/// <c>authorization/role-packages.json</c> in the static test data by <c>scripts/generate_role_packages.py</c>. A role
/// is found by its code (<c>daglig-leder</c>) or its Altinn 2 code (<c>DAGL</c>), ignoring case.
/// </summary>
public sealed class RoleAccessPackages
{
    private readonly Lazy<Dictionary<string, RolePackagesEntry>> _byCode;

    public RoleAccessPackages(IOptions<LocalPlatformSettings> settings)
    {
        string path = Path.Join(settings.Value.LocalTestingStaticTestDataPath, "authorization", "role-packages.json");
        _byCode = new(() => Load(path));
    }

    /// <summary>
    /// The packages the role gives for an organization of the unit type (such as <c>AS</c> or <c>VPFO</c>). Some
    /// packages apply only to some unit types, and are left out when the unit type is unknown.
    /// </summary>
    public IEnumerable<string> GetPackages(string roleCode, string? unitType)
    {
        if (!_byCode.Value.TryGetValue(roleCode, out var entry))
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

    private static Dictionary<string, RolePackagesEntry> Load(string path)
    {
        using var stream = File.OpenRead(path);
        var file = JsonSerializer.Deserialize<RolePackagesFile>(stream)
            ?? throw new InvalidOperationException($"{path} did not contain the role packages");
        return file.Roles
            .SelectMany(entry => entry.Codes.Select(code => (Code: code, Entry: entry)))
            .ToDictionary(r => r.Code, r => r.Entry, StringComparer.OrdinalIgnoreCase);
    }

    private sealed record RolePackagesFile([property: JsonPropertyName("roles")] List<RolePackagesEntry> Roles);

    private sealed record RolePackagesEntry(
        [property: JsonPropertyName("codes")] List<string> Codes,
        [property: JsonPropertyName("packages")] List<string>? Packages,
        [property: JsonPropertyName("packagesByUnitType")] Dictionary<string, List<string>>? PackagesByUnitType
    );
}
