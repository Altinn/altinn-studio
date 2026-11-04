namespace LocalTest.Services.TestData;

/// <summary>
/// Access package identifiers as test data may write them: the bare identifier (<c>lonn</c>) or the URN
/// (<c>urn:altinn:accesspackage:lonn</c>). The test data keeps the bare, lower-case identifier, which is the value the
/// PDP matches policies against.
/// </summary>
public static class AccessPackageIdentifier
{
    public const string UrnPrefix = "urn:altinn:accesspackage:";

    public static string Normalize(string package)
    {
        var value = package.Trim().ToLowerInvariant();
        return value.StartsWith(UrnPrefix, StringComparison.Ordinal) ? value[UrnPrefix.Length..] : value;
    }

    /// <summary>Normalizes each package, leaving out empty values and duplicates. A missing list is empty.</summary>
    public static List<string> Normalize(IEnumerable<string?>? packages) =>
        packages?
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => Normalize(p!))
            .Distinct()
            .ToList() ?? [];
}
