using System.Diagnostics;
using System.Runtime.CompilerServices;
using Altinn.Studio.Fleet.ApiUsage;

namespace Altinn.Studio.Fleet.Tests.ApiUsage;

/// <summary>Registers MSBuild before any test compiles code that uses it.</summary>
internal static class MSBuildRegistration
{
#pragma warning disable CA2255 // The test assembly is the application here, so it owns the process's MSBuild.
    [ModuleInitializer]
#pragma warning restore CA2255
    internal static void Register() => MSBuildSetup.EnsureRegistered();
}

/// <summary>
/// A small app library named like the real one, a third-party package built on it, and an app that uses both, in a
/// temporary folder. They have no package references, so restoring them needs no network.
/// </summary>
public sealed class LibraryFixture : IAsyncLifetime
{
    private static readonly string s_framework = $"net{Environment.Version.Major}.0";

    public string Root { get; } = Folder.CreateTemporary();

    public string LibraryProject => Path.Join(Root, "lib", "Altinn.App.Core", "Altinn.App.Core.csproj");

    public string AppDir => Path.Join(Root, "app");

    public string PackageAssembly => Path.Join(Root, "package-build", "Some.Package.dll");

    public async ValueTask InitializeAsync()
    {
        Write("lib/Altinn.App.Core/Altinn.App.Core.csproj", Project("<Nullable>enable</Nullable>", references: []));
        Write(
            "lib/Altinn.App.Core/Library.cs",
            """
            namespace Altinn.App.Core.Features;

            public interface IDataProcessor
            {
                Task ProcessDataWrite(object data);

                Task ProcessDataRead(object data);
            }

            public abstract class ValidatorBase
            {
                public abstract string Name { get; }

                public virtual bool Enabled => true;
            }

            public sealed class DataClient
            {
                public DataClient(string name) { }

                public Task<int> Get(int id) => Task.FromResult(id);

                public int Unused() => 0;
            }

            public static class DataClientExtensions
            {
                public static int Twice(this DataClient client, int value) => 2 * value;
            }

            [AttributeUsage(AttributeTargets.Class)]
            public sealed class FeatureAttribute : Attribute { }

            public sealed class Payload { }

            public class Exposed
            {
                public Payload Get() => new();
            }

            internal sealed class Hidden { }
            """
        );
        Write(
            "package/Some.Package/Some.Package.csproj",
            Project("", ["../../lib/Altinn.App.Core/Altinn.App.Core.csproj"])
        );
        Write(
            "package/Some.Package/PackageProcessor.cs",
            """
            using Altinn.App.Core.Features;

            namespace Some.Package;

            public sealed class PackageProcessor : IDataProcessor
            {
                public Task ProcessDataWrite(object data) => new DataClient("package").Get(2);

                public Task ProcessDataRead(object data) => Task.CompletedTask;
            }
            """
        );
        Write("app/App/App.csproj", Project("", ["../../lib/Altinn.App.Core/Altinn.App.Core.csproj"]));
        Write(
            "app/App/Processor.cs",
            """
            using Altinn.App.Core.Features;

            namespace App;

            [Feature]
            public sealed class Processor : IDataProcessor
            {
                public Task ProcessDataWrite(object data)
                {
                    var client = new DataClient("app");
                    _ = client.Twice(2);
                    return client.Get(1);
                }

                public Task ProcessDataRead(object data) => Task.CompletedTask;
            }

            public sealed class Validator : ValidatorBase
            {
                public override string Name => "validator";
            }
            """
        );

        var start = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (
            string arg in (string[])
                [
                    "build",
                    Path.Join(Root, "package", "Some.Package", "Some.Package.csproj"),
                    "-o",
                    Path.Join(Root, "package-build"),
                    "--disable-build-servers",
                ]
        )
        {
            start.ArgumentList.Add(arg);
        }

        Dotnet.PrepareEnvironment(start.Environment);
        using Process process = Process.Start(start)!;
        string output = await process.StandardOutput.ReadToEndAsync();
        await process.WaitForExitAsync();
        Assert.True(process.ExitCode == 0, output);
    }

    public ValueTask DisposeAsync()
    {
        Directory.Delete(Root, recursive: true);
        return ValueTask.CompletedTask;
    }

    private void Write(string path, string content)
    {
        string full = Path.Join(Root, path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        File.WriteAllText(full, content);
    }

    private static string Project(string properties, string[] references) =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>{s_framework}</TargetFramework>
                <ImplicitUsings>enable</ImplicitUsings>
                {properties}
              </PropertyGroup>
              <ItemGroup>
                {string.Join("\n", references.Select(r => $"<ProjectReference Include=\"{r}\" />"))}
              </ItemGroup>
            </Project>
            """;
}
