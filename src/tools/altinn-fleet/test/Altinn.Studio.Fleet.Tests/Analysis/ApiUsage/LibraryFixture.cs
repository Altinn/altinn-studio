using System.Diagnostics;
using System.Runtime.CompilerServices;
using Altinn.Studio.Fleet.Analysis.ApiUsage;

namespace Altinn.Studio.Fleet.Tests.Analysis.ApiUsage;

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

    /// <summary>An app with a compile error, beside code that uses the library.</summary>
    public string BrokenAppDir => Path.Join(Root, "broken-app");

    public string PackageAssembly => Path.Join(Root, "package-build", "Some.Package.dll");

    /// <summary>The library, compiled, as a package would carry it.</summary>
    public string LibraryAssembly => Path.Join(Root, "package-build", "Altinn.App.Core.dll");

    public string PackageProject => Path.Join(Root, "package", "Some.Package", "Some.Package.csproj");

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

            public sealed class Items
            {
                public Enumerator GetEnumerator() => default;

                public struct Enumerator
                {
                    public int Current => 0;

                    public bool MoveNext() => false;
                }
            }

            public sealed record Pair(int Left, int Right);

            public sealed record Point(int X, int Y);

            public sealed class Seq
            {
                public Seq Select(Func<int, int> selector) => this;

                public Seq OrderBy(Func<int, int> key) => this;

                public Seq ThenBy(Func<int, int> key) => this;
            }

            public sealed class Bag : System.Collections.IEnumerable
            {
                public void Add(int item) { }

                public System.Collections.IEnumerator GetEnumerator() => Array.Empty<int>().GetEnumerator();
            }

            public sealed class Later
            {
                public System.Runtime.CompilerServices.TaskAwaiter GetAwaiter() => Task.CompletedTask.GetAwaiter();
            }

            public abstract class ProcessorBase
            {
                protected ProcessorBase() { }

                public abstract void Run();
            }

            public abstract class NamedBase
            {
                protected NamedBase(string name = "named") { }
            }

            public readonly struct Money
            {
                public static explicit operator int(Money money) => 0;
            }

            public interface IStandard
            {
                static abstract bool Validate(string code);

                void Describe();
            }
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

        Write(
            "app/App/Implicit.cs",
            """
            using Altinn.App.Core.Features;

            namespace App;

            public static class Implicit
            {
                public static async Task<int> Use()
                {
                    int sum = 0;
                    foreach (int item in new Items())
                    {
                        sum += item;
                    }

                    var (left, right) = new Pair(1, 2);
                    if (new Point(1, 2) is (1, var y))
                    {
                        sum += y;
                    }

                    _ = from x in new Seq() orderby x, x select x;
                    _ = new Bag { 1, 2 };
                    await new Later();
                    return sum + left + right;
                }
            }
            """
        );
        Write(
            "app/App/Compiler.cs",
            """
            using Altinn.App.Core.Features;

            namespace App;

            // What the compiler calls for code that does not name it.
            public sealed class ImplicitBase : ProcessorBase
            {
                public override void Run() { }
            }

            public sealed class ExplicitBase : ProcessorBase
            {
                public ExplicitBase() { }

                public override void Run() { }
            }

            public sealed class Named : NamedBase { }

            public static class Casts
            {
                public static int Use(Money money) => (int)money;
            }

            public class DescribedBase
            {
                public void Describe() { }
            }

            public sealed class Standard : DescribedBase, IStandard
            {
                public static bool Validate(string code) => true;
            }
            """
        );
        Write("broken-app/App/App.csproj", Project("", ["../../lib/Altinn.App.Core/Altinn.App.Core.csproj"]));
        Write(
            "broken-app/App/Broken.cs",
            """
            using Altinn.App.Core.Features;

            namespace App;

            public static class Broken
            {
                public static Task<int> Use() => new DataClient("broken").Get(NoSuchValue);
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
        // Both streams are read at once, so that a full one cannot block the build.
        Task<string> output = process.StandardOutput.ReadToEndAsync();
        Task<string> error = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        Assert.True(process.ExitCode == 0, $"{await output}\n{await error}");
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
