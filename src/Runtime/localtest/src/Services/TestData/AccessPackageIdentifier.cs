namespace LocalTest.Services.TestData;

/// <summary>
/// Access package identifiers as test data may write them: the bare identifier (<c>lonn</c>) or the URN
/// (<c>urn:altinn:accesspackage:lonn</c>). The test data keeps the bare, lower-case identifier, which is the value the
/// PDP matches policies against.
/// </summary>
public static class AccessPackageIdentifier
{
    public const string UrnPrefix = "urn:altinn:accesspackage:";

    private static string Normalize(string package)
    {
        var value = package.Trim().ToLowerInvariant();
        return value.StartsWith(UrnPrefix, StringComparison.Ordinal) ? value[UrnPrefix.Length..].Trim() : value;
    }

    /// <summary>
    /// Normalizes each package, leaving out empty values (also a URN prefix with no identifier) and duplicates. A missing
    /// list is empty.
    /// </summary>
    public static List<string> Normalize(IEnumerable<string?>? packages) =>
        packages?
            .Where(p => p is not null)
            .Select(p => Normalize(p!))
            .Where(p => p.Length > 0)
            .Distinct()
            .ToList() ?? [];
}
