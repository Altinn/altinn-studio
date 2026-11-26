using System.Text.Json;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>A package in a restored project's graph, in one of its target frameworks.</summary>
/// <param name="Name">The package's ID.</param>
/// <param name="Version">Its version.</param>
/// <param name="Target">What <c>project.assets.json</c> lists for it under the target framework.</param>
/// <param name="Path">Its folder, relative to one of <see cref="ProjectAssets.PackageFolders"/>.</param>
internal sealed record AssetsPackage(string Name, string Version, JsonElement Target, string? Path);

/// <summary>What a restore wrote to a project's <c>obj/project.assets.json</c>: the packages it resolved.</summary>
internal sealed class ProjectAssets : IDisposable
{
    private readonly JsonDocument _document;

    private ProjectAssets(JsonDocument document)
    {
        _document = document;
        JsonElement root = document.RootElement;
        PackageFolders = root.TryGetProperty("packageFolders", out JsonElement folders)
            ? [.. folders.EnumerateObject().Select(p => p.Name)]
            : [];
        bool hasLibraries = root.TryGetProperty("libraries", out JsonElement libraries);
        var packages = new List<AssetsPackage>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (JsonProperty target in root.GetProperty("targets").EnumerateObject())
        {
            foreach (JsonProperty library in target.Value.EnumerateObject())
            {
                int slash = library.Name.IndexOf('/', StringComparison.Ordinal);
                if (slash <= 0 || library.Value.GetProperty("type").GetString() != "package" || !seen.Add(library.Name))
                {
                    continue;
                }

                string? path =
                    hasLibraries && libraries.TryGetProperty(library.Name, out JsonElement entry)
                        ? entry.GetProperty("path").GetString()
                        : null;
                packages.Add(
                    new AssetsPackage(library.Name[..slash], library.Name[(slash + 1)..], library.Value, path)
                );
            }
        }

        Packages = packages;
    }

    /// <summary>The folders the packages are in.</summary>
    public IReadOnlyList<string> PackageFolders { get; }

    /// <summary>Each package once, from the first target framework that has it.</summary>
    public IReadOnlyList<AssetsPackage> Packages { get; }

    /// <summary>
    /// The Altinn.App package that says which version of the app library the project uses: the first of
    /// <see cref="AltinnAppPackage.PackageNames"/> it resolved, also from a build of a pull request. <c>null</c> when
    /// it resolved none, such as with a project reference to the app library's source.
    /// </summary>
    public AltinnAppPackage? LibraryPackage
    {
        get
        {
            foreach (string name in AltinnAppPackage.PackageNames)
            {
                if (
                    Packages.FirstOrDefault(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) is { } found
                    && AltinnAppPackage.TryParse(
                        new PackageReference(found.Name, found.Version),
                        out AltinnAppPackage? package
                    )
                )
                {
                    return package;
                }
            }

            return null;
        }
    }

    /// <summary>Reads a restored project's assets, or returns <c>null</c> when it has none.</summary>
    public static ProjectAssets? Read(string projectDir)
    {
        string path = System.IO.Path.Join(projectDir, "obj", "project.assets.json");
        return File.Exists(path) ? new ProjectAssets(JsonDocument.Parse(File.ReadAllBytes(path))) : null;
    }

    public void Dispose() => _document.Dispose();
}
