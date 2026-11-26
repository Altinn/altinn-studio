using System.Xml.Linq;
using Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.Studio.Fleet.Tests.Analysis.ApiUsage;

public sealed class AppCollectorTests(LibraryFixture fixture) : IClassFixture<LibraryFixture>
{
    private const string Ns = "Altinn.App.Core.Features";

    [Fact]
    public async Task Collect_RecordsHowTheAppsCodeUsesTheLibrary()
    {
        AppUsage usage = await AppCollector.Collect(fixture.AppDir, TestContext.Current.CancellationToken);

        Assert.Null(usage.Failure);
        // The app references the library's project, not a package, so there is no published version to read.
        Assert.Equal(("App/App.csproj", null, 0), (usage.Project, usage.LibraryVersion, usage.CompileErrors));
        HashSet<string> uses = [.. usage.Uses.Select(u => $"{u.Kind} {u.Symbol}")];
        Assert.Superset(
            new HashSet<string>
            {
                $"implement T:{Ns}.IDataProcessor",
                $"implement M:{Ns}.IDataProcessor.ProcessDataWrite(System.Object)",
                $"implement M:{Ns}.IDataProcessor.ProcessDataRead(System.Object)",
                $"inherit T:{Ns}.ValidatorBase",
                $"override P:{Ns}.ValidatorBase.Name",
                $"construct M:{Ns}.DataClient.#ctor(System.String)",
                $"call M:{Ns}.DataClient.Get(System.Int32)",
                $"call M:{Ns}.DataClientExtensions.Twice({Ns}.DataClient,System.Int32)",
                $"attribute M:{Ns}.FeatureAttribute.#ctor",
                $"type T:{Ns}.DataClient",
            },
            uses
        );
        Assert.DoesNotContain(uses, u => u.Contains("Unused", StringComparison.Ordinal));
        Assert.All(usage.Uses, u => Assert.Equal(UseSources.App, u.Source));
        Assert.Equal(
            "App/Processor.cs:12",
            usage.Uses.Single(u => u.Symbol == $"M:{Ns}.DataClient.Get(System.Int32)").FirstLocation
        );
    }

    [Fact]
    public async Task Collect_RecordsTheMembersThatCodeCallsWithoutNamingThem()
    {
        AppUsage usage = await AppCollector.Collect(fixture.AppDir, TestContext.Current.CancellationToken);

        HashSet<string> uses = [.. usage.Uses.Select(u => $"{u.Kind} {u.Symbol}")];
        Assert.Superset(
            new HashSet<string>
            {
                $"call M:{Ns}.Items.GetEnumerator",
                $"call M:{Ns}.Items.Enumerator.MoveNext",
                $"access P:{Ns}.Items.Enumerator.Current",
                $"call M:{Ns}.Pair.Deconstruct(System.Int32@,System.Int32@)",
                $"call M:{Ns}.Bag.Add(System.Int32)",
                $"call M:{Ns}.Later.GetAwaiter",
                $"call M:{Ns}.Point.Deconstruct(System.Int32@,System.Int32@)",
                $"call M:{Ns}.Seq.OrderBy(System.Func{{System.Int32,System.Int32}})",
                $"call M:{Ns}.Seq.ThenBy(System.Func{{System.Int32,System.Int32}})",
            },
            uses
        );
    }

    [Fact]
    public async Task Collect_WithCompileErrors_FailsButKeepsTheUsesItFound()
    {
        AppUsage usage = await AppCollector.Collect(fixture.BrokenAppDir, TestContext.Current.CancellationToken);

        Assert.Equal(1, usage.CompileErrors);
        Assert.StartsWith("The app has 1 compile errors", usage.Failure, StringComparison.Ordinal);
        Assert.Contains(usage.Uses, u => u.Symbol == $"M:{Ns}.DataClient.#ctor(System.String)");
    }

    [Fact]
    public void Scan_ReadsAPackagesImplementation_AndSkipsTheLibrarysOwnAssembliesWhateverThePackage()
    {
        string root = Folder.CreateTemporary();
        try
        {
            string packages = Path.Join(root, "packages");
            string lib = Path.Join(packages, "altinn.app.extra", "1.0.0", "lib", "net8.0");
            Directory.CreateDirectory(lib);
            File.Copy(fixture.PackageAssembly, Path.Join(lib, "Altinn.App.Extra.dll"));
            // A package with an implementation for one platform only, beside its reference assembly.
            string rid = Path.Join(packages, "rid.package", "2.0.0", "runtimes", "linux-x64", "lib", "net8.0");
            Directory.CreateDirectory(rid);
            File.Copy(fixture.PackageAssembly, Path.Join(rid, "Rid.Package.dll"));
            // A preview build of the app library, in a package of its own name, is the library, not a package on it.
            string preview = Path.Join(packages, "altinn.app.api.experimental", "1.0.0-pr.1", "lib", "net8.0");
            Directory.CreateDirectory(preview);
            File.Copy(fixture.PackageAssembly, Path.Join(preview, "Altinn.App.Api.dll"));
            Directory.CreateDirectory(Path.Join(root, "obj"));
            File.WriteAllText(
                Path.Join(root, "obj", "project.assets.json"),
                $$"""
                {
                  "targets": {
                    "net8.0": {
                      "Altinn.App.Extra/1.0.0": {
                        "type": "package",
                        "compile": { "ref/net8.0/Altinn.App.Extra.dll": {} },
                        "runtime": { "lib/net8.0/Altinn.App.Extra.dll": {} }
                      },
                      "Altinn.App.Core/1.0.0": {
                        "type": "package",
                        "compile": { "lib/net8.0/Altinn.App.Core.dll": {} }
                      },
                      "Altinn.App.Api.Experimental/1.0.0-pr.1": {
                        "type": "package",
                        "runtime": { "lib/net8.0/Altinn.App.Api.dll": {} }
                      },
                      "Rid.Package/2.0.0": {
                        "type": "package",
                        "compile": { "ref/net8.0/Rid.Package.dll": {} },
                        "runtime": { "lib/net8.0/_._": {} },
                        "runtimeTargets": {
                          "runtimes/linux-x64/lib/net8.0/Rid.Package.dll": { "assetType": "runtime", "rid": "linux-x64" }
                        }
                      }
                    }
                  },
                  "libraries": {
                    "Altinn.App.Extra/1.0.0": { "path": "altinn.app.extra/1.0.0" },
                    "Altinn.App.Api.Experimental/1.0.0-pr.1": { "path": "altinn.app.api.experimental/1.0.0-pr.1" },
                    "Rid.Package/2.0.0": { "path": "rid.package/2.0.0" },
                    "Altinn.App.Core/1.0.0": { "path": "altinn.app.core/1.0.0" }
                  },
                  "packageFolders": { {{System.Text.Json.JsonSerializer.Serialize(
                    packages + Path.DirectorySeparatorChar
                )}}: {} }
                }
                """
            );

            List<PackageUse> found = BinaryReferences.Scan(root);

            Assert.Equal(
                [("Altinn.App.Extra", "1.0.0"), ("Rid.Package", "2.0.0")],
                found.Select(p => (p.Package, p.Version)).Order()
            );
            Assert.All(
                found,
                package =>
                    Assert.Contains(
                        new PackageReferenceUse($"M:{Ns}.DataClient.Get", UseKinds.Call),
                        package.References
                    )
            );
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task Read_WithAProjectThatDoesNotLoad_Throws()
    {
        string root = Folder.CreateTemporary();
        try
        {
            string project = Path.Join(root, "Altinn.App.Core.csproj");
            File.WriteAllText(
                project,
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <Import Project="missing.props" />
                </Project>
                """
            );

            await Assert.ThrowsAsync<FleetException>(() =>
                LibraryApiReader.Read([project], fromReferences: false, root, TestContext.Current.CancellationToken)
            );
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task Read_ListsTheSameMembersFromSourceAsFromTheCompiledLibrary()
    {
        List<LibraryApiEntry> source = await LibraryApiReader.Read(
            [fixture.LibraryProject],
            fromReferences: false,
            fixture.Root,
            TestContext.Current.CancellationToken
        );
        MetadataReference library = MetadataReference.CreateFromFile(fixture.LibraryAssembly);
        var compilation = CSharpCompilation.Create(
            "Probe",
            references:
            [
                library,
                .. ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!)
                    .Split(Path.PathSeparator)
                    .Select(path => MetadataReference.CreateFromFile(path)),
            ]
        );
        var assembly = (IAssemblySymbol)compilation.GetAssemblyOrModuleSymbol(library)!;

        List<LibraryApiEntry> compiled = LibraryApiReader.ReadAssembly(assembly, sourceRoot: null);

        Assert.Equal(
            source.Where(e => e.Visible).Select(e => e.Symbol),
            compiled.Where(e => e.Visible).Select(e => e.Symbol)
        );
        Assert.Contains(source, e => e.Symbol == $"M:{Ns}.Pair.#ctor(System.Int32,System.Int32)");
        Assert.DoesNotContain(source, e => e.Symbol.StartsWith($"M:{Ns}.Pair.Deconstruct", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Read_WithAProjectBeforeOneItReferences_ReadsBoth()
    {
        List<LibraryApiEntry> api = await LibraryApiReader.Read(
            [fixture.PackageProject, fixture.LibraryProject],
            fromReferences: false,
            fixture.Root,
            TestContext.Current.CancellationToken
        );

        Assert.Contains(api, e => e.Symbol == $"T:{Ns}.DataClient");
    }

    [Theory]
    [InlineData(
        "error NU1102: Unable to find package Altinn.App.Clients.Fiks with version (= 7.0.0)",
        "Altinn.App.Clients.Fiks"
    )]
    [InlineData(
        "/x/LibraryApi.csproj : error NU1101: Unable to find package Altinn.App.Core. No packages exist.",
        "Altinn.App.Core"
    )]
    [InlineData(
        "/x/LibraryApi.csproj : error NU1102: Unable to find package Altinn.App.Core with version (= 6.0.0)\n"
            + "/x/LibraryApi.csproj : error NU1102:   - Found 59 version(s) in nuget.org [ Nearest version: 7.0.0 ]",
        "Altinn.App.Core"
    )]
    [InlineData("error NU1301: Unable to load the service index for source https://api.nuget.org/v3/index.json.", null)]
    [InlineData(
        "error NU1102: Unable to find package Altinn.App.Clients.Fiks with version (= 7.0.0)\nerror NU1301: Unable to load the service index",
        null
    )]
    public void MissingPackages_NamesOnlyPackagesThatDoNotExist(string error, string? package)
    {
        HashSet<string>? missing = LibraryApiReader.MissingPackages(
            error.Replace("\\n", "\n", StringComparison.Ordinal)
        );

        Assert.Equal(package is null ? null : [package], missing?.ToArray());
    }

    [Fact]
    public void Read_ListsWhatAPackageAssemblyReferences_ByName()
    {
        List<PackageReferenceUse>? references = BinaryReferences.Read(fixture.PackageAssembly);

        Assert.NotNull(references);
        Assert.Superset(
            new HashSet<PackageReferenceUse>
            {
                new($"T:{Ns}.IDataProcessor", UseKinds.Implement),
                new($"M:{Ns}.DataClient.#ctor", UseKinds.Construct),
                new($"M:{Ns}.DataClient.Get", UseKinds.Call),
            },
            references.ToHashSet()
        );
    }

    [Fact]
    public async Task Read_ListsThePublicApi_WithInternalTypesAndWhatSignaturesExpose()
    {
        List<LibraryApiEntry> api = await LibraryApiReader.Read(
            [fixture.LibraryProject],
            fromReferences: false,
            fixture.Root,
            TestContext.Current.CancellationToken
        );

        Dictionary<string, LibraryApiEntry> bySymbol = api.ToDictionary(e => e.Symbol);
        Assert.False(bySymbol[$"T:{Ns}.Hidden"].Visible);
        Assert.True(bySymbol[$"T:{Ns}.IDataProcessor"].ExtensionPoint);
        Assert.Equal([$"T:{Ns}.Payload"], bySymbol[$"M:{Ns}.Exposed.Get"].Exposes);
        Assert.Equal("constructor", bySymbol[$"M:{Ns}.Exposed.#ctor"].Kind);
        Assert.Equal(
            ("lib/Altinn.App.Core/Library.cs", 23),
            (bySymbol[$"M:{Ns}.DataClient.Unused"].File, bySymbol[$"M:{Ns}.DataClient.Unused"].Line)
        );
        Assert.DoesNotContain($"M:{Ns}.ValidatorBase.get_Name", bySymbol.Keys);
    }

    [Fact]
    public void FindProjects_TellsTheAppFromItsTests()
    {
        string root = Folder.CreateTemporary();
        try
        {
            WriteProject(root, "src/Web/Web.csproj", "Altinn.App.Api");
            WriteProject(
                root,
                "src/Web.Tests/Web.Tests.csproj",
                "Microsoft.NET.Test.Sdk",
                project: "../Web/Web.csproj"
            );
            WriteProject(root, "src/Other.Tests/Other.Tests.csproj", "Microsoft.NET.Test.Sdk");
            WriteProject(root, "src/Web/obj/Copy.csproj", "Altinn.App.Api");

            string? app = AppCollector.FindAppProject(root);

            Assert.Equal(Path.Join(root, "src", "Web", "Web.csproj"), app);
            Assert.Equal(
                [Path.Join(root, "src", "Web.Tests", "Web.Tests.csproj")],
                AppCollector.FindTestProjects(root, app!)
            );
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static void WriteProject(string root, string path, string package, string? project = null)
    {
        string full = Path.Join(root, path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        new XDocument(
            new XElement(
                "Project",
                new XAttribute("Sdk", "Microsoft.NET.Sdk"),
                new XElement(
                    "ItemGroup",
                    new XElement("PackageReference", new XAttribute("Include", package)),
                    project is null ? null : new XElement("ProjectReference", new XAttribute("Include", project))
                )
            )
        ).Save(full);
    }
}
