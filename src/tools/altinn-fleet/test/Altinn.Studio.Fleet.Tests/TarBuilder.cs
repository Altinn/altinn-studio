using System.Formats.Tar;
using System.IO.Compression;
using System.Text;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>Builds a gzipped tar the way Gitea archives a commit: one top-level folder with the tree in it.</summary>
internal sealed class TarBuilder(string root)
{
    private readonly List<Action<TarWriter>> _entries = [];

    /// <summary>
    /// A small app with a project file, a config file and, when it is on v8, the page that loads the app frontend.
    /// </summary>
    public static TarBuilder App(string app, string version, string altinnVersion = "8.5.0")
    {
        TarBuilder builder = new TarBuilder(app)
            .Directory("App")
            .File(
                "App/App.csproj",
                $"""
                <Project Sdk="Microsoft.NET.Sdk.Web">
                  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
                  <ItemGroup>
                    <PackageReference Include="Altinn.App.Api" Version="{altinnVersion}" />
                    <PackageReference Include="Altinn.App.Core" Version="{altinnVersion}" />
                  </ItemGroup>
                </Project>
                """
            )
            .File("App/config/applicationmetadata.json", $$"""{"id":"x/{{app}}","version":"{{version}}"}""");
        return altinnVersion.StartsWith("8.", StringComparison.Ordinal) ? builder.File(IndexPath, IndexPage) : builder;
    }

    public const string IndexPath = "App/views/Home/Index.cshtml";

    public const string IndexPage =
        "<html><script src=\"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js\"></script></html>";

    public TarBuilder Directory(string path)
    {
        _entries.Add(w => w.WriteEntry(new PaxTarEntry(TarEntryType.Directory, $"{root}/{path}/")));
        return this;
    }

    public TarBuilder File(string path, string content) => RawFile($"{root}/{path}", Encoding.UTF8.GetBytes(content));

    public TarBuilder RawFile(string name, byte[] content)
    {
        _entries.Add(w =>
            w.WriteEntry(
                new PaxTarEntry(TarEntryType.RegularFile, name)
                {
                    DataStream = new MemoryStream(content),
                    ModificationTime = new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero),
                    Mode =
                        UnixFileMode.UserRead
                        | UnixFileMode.UserWrite
                        | UnixFileMode.UserExecute
                        | UnixFileMode.OtherWrite,
                }
            )
        );
        return this;
    }

    public TarBuilder Entry(TarEntryType type, string name, string? linkName = null)
    {
        _entries.Add(w =>
        {
            var entry = new PaxTarEntry(type, name);
            if (linkName is not null)
            {
                entry.LinkName = linkName;
            }

            w.WriteEntry(entry);
        });
        return this;
    }

    public byte[] Build()
    {
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(output, CompressionLevel.Fastest, leaveOpen: true))
        using (var tar = new TarWriter(gzip, TarEntryFormat.Pax, leaveOpen: true))
        {
            tar.WriteEntry(
                new PaxGlobalExtendedAttributesTarEntry(new Dictionary<string, string> { ["comment"] = "commit" })
            );
            tar.WriteEntry(new PaxTarEntry(TarEntryType.Directory, $"{root}/"));
            foreach (Action<TarWriter> entry in _entries)
            {
                entry(tar);
            }
        }

        return output.ToArray();
    }
}
