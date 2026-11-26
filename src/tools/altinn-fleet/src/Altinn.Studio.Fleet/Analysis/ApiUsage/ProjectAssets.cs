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
        foreach (JsonProperty target in root.GetProperty("targets").EnumerateObject())
        {
            foreach (JsonProperty library in target.Value.EnumerateObject())
            {
                int slash = library.Name.IndexOf('/', StringComparison.Ordinal);
                if (slash <= 0 || library.Value.GetProperty("type").GetString() != "package")
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

    /// <summary>
    /// Each package in each target framework, since a package can have an implementation per framework.
    /// </summary>
    public IReadOnlyList<AssetsPackage> Packages { get; }

    /// <summary>The package that a file, such as an assembly a compilation references, is in, or <c>null</c>.</summary>
    public AssetsPackage? PackageOf(string file)
    {
        StringComparison comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;
        string path = System.IO.Path.GetFullPath(file);
        return Packages.FirstOrDefault(package =>
            package.Path is { } relative
            && PackageFolders.Any(folder =>
                path.StartsWith(
                    System.IO.Path.GetFullPath(System.IO.Path.Join(folder, relative))
                        + System.IO.Path.DirectorySeparatorChar,
                    comparison
                )
            )
        );
    }

    /// <summary>Reads a restored project's assets from <c>obj</c>, or returns <c>null</c> without them.</summary>
    public static ProjectAssets? Read(string projectDir) => ReadFile(System.IO.Path.Join(projectDir, "obj", FileName));

    /// <summary>Reads an assets file, or returns <c>null</c> when there is none.</summary>
    public static ProjectAssets? ReadFile(string path) =>
        File.Exists(path) ? new ProjectAssets(JsonDocument.Parse(File.ReadAllBytes(path))) : null;

    /// <summary>The name of the file that a restore writes a project's assets to.</summary>
    public const string FileName = "project.assets.json";

    public void Dispose() => _document.Dispose();
}
