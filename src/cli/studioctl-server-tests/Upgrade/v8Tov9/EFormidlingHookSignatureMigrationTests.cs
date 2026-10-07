using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the v9 eFormidling metadata and receivers signatures, which take the instance's data accessor instead of
/// the instance. The contract is "the migrated app compiles against v9", so rewrites are compiled against a
/// v9-shaped stub; the text assertions pin the layout of what the rewrite inserts. Most cases run both with a
/// semantic model (the app compiled against v8) and without (syntax fallback).
/// </summary>
public sealed class EFormidlingHookSignatureMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    /// <summary>
    /// Writes a fixture file with the given line ending. The raw string literals below carry whatever line endings
    /// this source file was checked out with, while the assertions pin an exact layout.
    /// </summary>
    private string Write(string relativePath, string content, string lineEnding = "\n") =>
        _app.Write(relativePath, content.ReplaceLineEndings(lineEnding));

    /// <summary>
    /// The eFormidling surface the migration targets, in its v8 or v9 shape. <c>Instance</c> really lives in the
    /// storage interface package; only the interfaces' assembly matters to the migration, so one stub holds both.
    /// </summary>
    private static string SdkStub(bool v9)
    {
        var parameter = v9 ? "IInstanceDataAccessor dataAccessor" : "Instance instance";
        var receivers = v9
            ? "Task<List<Receiver>> GetEFormidlingReceivers(IInstanceDataAccessor dataAccessor, string? receiverFromConfig);"
            : """
                Task<List<Receiver>> GetEFormidlingReceivers(Instance instance);

                Task<List<Receiver>> GetEFormidlingReceivers(Instance instance, string? receiverFromConfig) =>
                    GetEFormidlingReceivers(instance);
                """;
        // v9 makes the default receivers internal and drops the v8 registration; no test compiles them against v9.
        var v8Only = v9
            ? ""
            : """
                namespace Altinn.App.Core.EFormidling.Implementation
                {
                    public class DefaultEFormidlingReceivers : IEFormidlingReceivers
                    {
                        public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) =>
                            Task.FromResult(new List<Receiver>());
                    }
                }

                namespace Altinn.App.Core.EFormidling.Extensions
                {
                    public static class EFormidlingExtensions
                    {
                        public static object AddEFormidlingServices2<TMetadata, TReceivers>(
                            this object services,
                            object configuration
                        ) => services;
                    }
                }
                """;
        return $$"""
            #nullable enable
            using System.Collections.Generic;
            using System.IO;
            using System.Threading.Tasks;
            using Altinn.App.Core.EFormidling.Interface;
            using Altinn.App.Core.EFormidling.Models.SBD;
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance
                {
                    public string Id { get; set; } = "";
                }
            }

            namespace Altinn.App.Core.Features
            {
                public interface IInstanceDataAccessor
                {
                    Instance Instance { get; }
                }
            }

            namespace Altinn.App.Core.EFormidling.Models.SBD
            {
                public class Receiver { }
            }

            namespace Altinn.App.Core.EFormidling.Interface
            {
                public interface IEFormidlingMetadata
                {
                    Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata({{parameter}});
                }

                public interface IEFormidlingReceivers
                {
                    {{receivers}}
                }
            }

            {{v8Only}}
            """;
    }

    private static readonly Lazy<MetadataReference> _v8Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: true))
    );

    /// <summary>The usings every fixture file needs; the v8 app template has no implicit usings.</summary>
    private const string ModelUsings = """
        using System;
        using System.Collections.Generic;
        using System.IO;
        using System.Threading.Tasks;
        using Altinn.App.Core.EFormidling.Interface;
        using Altinn.App.Core.EFormidling.Models.SBD;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    /// <summary>A v8 metadata implementation in the shape the docs and the prod apps use.</summary>
    private const string V8Metadata = """
        public class EFormidlingMetadata : IEFormidlingMetadata
        {
            public async Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(Instance instance)
            {
                // The arkivmelding names the instance
                Stream stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(instance.Id));
                return await Task.FromResult(("arkivmelding.xml", stream));
            }
        }
        """;

    /// <summary>A v8 receivers implementation with only the single-parameter overload, as every prod app has.</summary>
    private const string V8Receivers = """
        public class EFormidlingReceivers : IEFormidlingReceivers
        {
            public async Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
            {
                await Task.CompletedTask;
                return instance.Id.Length > 0 ? [new Receiver()] : [];
            }
        }
        """;

    private const string AccessorType = "global::Altinn.App.Core.Features.IInstanceDataAccessor";

    private CSharpSourceScanner Scanner(bool semantic) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, bool nullableAnnotations = true) =>
        new EFormidlingHookSignatureMigration(Scanner(semantic), nullableAnnotations).Migrate(
            TestContext.Current.CancellationToken
        );

    private void AssertCompilesAgainstV9()
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
    }

    private static string Normalized(string text) => text.ReplaceLineEndings("\n");

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task BothHooks_GetTheV9Signatures_AndCompileAgainstV9(bool semantic)
    {
        var metadata = Write("logic/EFormidlingMetadata.cs", ModelUsings + "\n\n" + V8Metadata);
        var receivers = Write("logic/EFormidlingReceivers.cs", ModelUsings + "\n\n" + V8Receivers);

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(2, result.Warnings.Count);
        Assert.Contains(
            result.Warnings,
            static w =>
                w.Contains("EFormidlingMetadata.cs:")
                && w.Contains("EFormidlingMetadata.GenerateEFormidlingMetadata")
                && w.Contains("IEFormidlingMetadata")
        );
        Assert.Contains(
            result.Warnings,
            static w => w.Contains("EFormidlingReceivers.GetEFormidlingReceivers") && w.Contains("receiverFromConfig")
        );
        AssertCompilesAgainstV9();

        var migratedMetadata = Normalized(await File.ReadAllTextAsync(metadata, TestContext.Current.CancellationToken));
        Assert.Contains(
            $$"""
                public async Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata({{AccessorType}} dataAccessor)
                {
                    var instance = dataAccessor.Instance;
                    // The arkivmelding names the instance
                    Stream stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(instance.Id));
            """.ReplaceLineEndings("\n"),
            migratedMetadata
        );
        var migratedReceivers = Normalized(
            await File.ReadAllTextAsync(receivers, TestContext.Current.CancellationToken)
        );
        Assert.Contains(
            $$"""
                public async Task<List<Receiver>> GetEFormidlingReceivers({{AccessorType}} dataAccessor, string? receiverFromConfig)
                {
                    var instance = dataAccessor.Instance;
                    await Task.CompletedTask;
            """.ReplaceLineEndings("\n"),
            migratedReceivers
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task BothReceiversOverloads_MigrateTheTwoParameterOne_AndKeepTheOther(bool semantic)
    {
        var path = Write(
            "logic/EFormidlingReceivers.cs",
            ModelUsings
                + "\n\n"
                + """
                public class EFormidlingReceivers : IEFormidlingReceivers
                {
                    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) =>
                        Task.FromResult(new List<Receiver> { new() });

                    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance, string? receiverFromConfig) =>
                        GetEFormidlingReceivers(instance);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains(
            result.Warnings,
            static w => w.Contains("EFormidlingReceivers.cs:11:") && w.Contains("no longer called")
        );
        Assert.Contains(
            result.Warnings,
            static w => w.Contains("EFormidlingReceivers.cs:14:") && w.Contains("first parameter")
        );
        AssertCompilesAgainstV9();

        // The expression body uses the instance, so it becomes a block that reads it first.
        var migrated = Normalized(await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
        Assert.Contains(
            $$"""
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) =>
                    Task.FromResult(new List<Receiver> { new() });

                public Task<List<Receiver>> GetEFormidlingReceivers({{AccessorType}} dataAccessor, string? receiverFromConfig)
                {
                    var instance = dataAccessor.Instance;
                    return GetEFormidlingReceivers(instance);
                }
            }
            """.ReplaceLineEndings("\n"),
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExpressionBodies_BecomeBlocksOnlyWhenTheyUseTheInstance(bool semantic)
    {
        var throwing = Write(
            "logic/ThrowingMetadata.cs",
            ModelUsings
                + "\n\n"
                + """
                public class ThrowingMetadata : IEFormidlingMetadata
                {
                    public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(Instance instance) => throw new NotSupportedException(instance.Id); // Not shipped
                }
                """
        );
        var unused = Write(
            "logic/UnusedReceivers.cs",
            ModelUsings
                + "\n\n"
                + """
                public class UnusedReceivers : IEFormidlingReceivers
                {
                    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9();
        Assert.Contains(
            $$"""
                public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata({{AccessorType}} dataAccessor)
                {
                    var instance = dataAccessor.Instance;
                    throw new NotSupportedException(instance.Id);
                } // Not shipped
            }
            """.ReplaceLineEndings("\n"),
            Normalized(await File.ReadAllTextAsync(throwing, TestContext.Current.CancellationToken))
        );
        Assert.Contains(
            $"public Task<List<Receiver>> GetEFormidlingReceivers({AccessorType} dataAccessor, string? receiverFromConfig) => throw new NotImplementedException();",
            await File.ReadAllTextAsync(unused, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitImplementations_AreMigrated(bool semantic)
    {
        var path = Write(
            "logic/ExplicitHooks.cs",
            ModelUsings
                + "\n\n"
                + """
                public class ExplicitHooks : IEFormidlingMetadata, IEFormidlingReceivers
                {
                    Task<(string MetadataFilename, Stream Metadata)> IEFormidlingMetadata.GenerateEFormidlingMetadata(Instance instance) =>
                        Task.FromResult(("arkivmelding.xml", (Stream)new MemoryStream()));

                    Task<List<Receiver>> IEFormidlingReceivers.GetEFormidlingReceivers(Instance instance) =>
                        Task.FromResult(new List<Receiver>());
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(2, result.Warnings.Count);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);
        Assert.Contains($"IEFormidlingMetadata.GenerateEFormidlingMetadata({AccessorType} dataAccessor) =>", migrated);
        Assert.Contains(
            $"IEFormidlingReceivers.GetEFormidlingReceivers({AccessorType} dataAccessor, string? receiverFromConfig) =>",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MethodsOutsideTheInterfaces_AreLeftAlone(bool semantic)
    {
        var path = Write(
            "logic/NotAHook.cs",
            ModelUsings
                + "\n\n"
                + """
                public class NotAHook
                {
                    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => Task.FromResult(new List<Receiver>());
                }
                """
        );
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Empty(result.Messages);
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task AlreadyMigratedHooks_AreLeftAlone()
    {
        // Code already in the v9 shape does not compile against v8, so only the syntax fallback can meet it.
        var path = Write(
            "logic/EFormidlingReceivers.cs",
            ModelUsings
                + "\n"
                + "using Altinn.App.Core.Features;\n\n"
                + """
                public class EFormidlingReceivers : IEFormidlingReceivers
                {
                    public Task<List<Receiver>> GetEFormidlingReceivers(IInstanceDataAccessor dataAccessor, string? receiverFromConfig) =>
                        Task.FromResult(new List<Receiver>());
                }
                """
        );
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var result = Migrate(semantic: false);

        Assert.Empty(result.Messages);
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ShapesWithoutAMechanicalFix_AreReportedAndLeftAlone(bool semantic)
    {
        var path = Write(
            "logic/Hooks.cs",
            ModelUsings
                + "\n\n"
                + """
                public class EFormidlingMetadata : IEFormidlingMetadata
                {
                    public virtual Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(Instance instance) =>
                        Task.FromResult(("arkivmelding.xml", (Stream)new MemoryStream()));
                }

                public class EFormidlingReceivers : IEFormidlingReceivers
                {
                    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
                    {
                        var dataAccessor = instance.Id;
                        return Task.FromResult(new List<Receiver>());
                    }
                }
                """
        );
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Equal(2, result.Todos.Count);
        Assert.Contains(
            result.Todos,
            static t => t.Contains("EFormidlingMetadata.GenerateEFormidlingMetadata is virtual")
        );
        Assert.Contains(
            result.Todos,
            static t => t.Contains("EFormidlingReceivers.GetEFormidlingReceivers already uses the name 'dataAccessor'")
        );
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CallsThatPassTheInstance_AreReported(bool semantic)
    {
        Write("logic/EFormidlingMetadata.cs", ModelUsings + "\n\n" + V8Metadata);
        Write(
            "logic/Preview.cs",
            ModelUsings
                + "\n\n"
                + """
                public class Preview
                {
                    public Task<(string MetadataFilename, Stream Metadata)> Direct(Instance instance) =>
                        new EFormidlingMetadata().GenerateEFormidlingMetadata(instance);

                    public Task<(string MetadataFilename, Stream Metadata)> ThroughTheInterface(IEFormidlingMetadata metadata, Instance instance) =>
                        metadata.GenerateEFormidlingMetadata(instance);

                    public string Name => nameof(EFormidlingMetadata.GenerateEFormidlingMetadata);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Equal(
            ["logic/Preview.cs:12", "logic/Preview.cs:15"],
            result.Todos.Select(static t => t.Replace('\\', '/')[..t.IndexOf(": ", StringComparison.Ordinal)])
        );
        Assert.All(
            result.Todos,
            static t => Assert.Contains("takes 'Altinn.App.Core.Features.IInstanceDataAccessor'", t)
        );
    }

    [Fact]
    public async Task AnAppInterfaceOfTheSameName_WithoutCompilation_IsReportedNotRewritten()
    {
        var path = Write(
            "logic/OwnReceivers.cs",
            """
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IEFormidlingReceivers
            {
                Task<List<string>> GetEFormidlingReceivers(Instance instance);
            }

            public class OwnReceivers : IEFormidlingReceivers
            {
                public Task<List<string>> GetEFormidlingReceivers(Instance instance) => Task.FromResult(new List<string>());
            }
            """
        );
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var syntax = Migrate(semantic: false);

        Assert.Contains(syntax.Todos, static t => t.Contains("OwnReceivers.GetEFormidlingReceivers may implement"));
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));

        // The compilation tells the app's interface from the Altinn one, so there is nothing to report.
        var semantic = Migrate(semantic: true);

        Assert.Empty(semantic.Messages);
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task CrlfFiles_KeepTheirLineEndings()
    {
        var path = Write("logic/EFormidlingMetadata.cs", ModelUsings + "\n\n" + V8Metadata, lineEnding: "\r\n");

        Migrate(semantic: true);

        var migrated = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);
        Assert.Contains("{\r\n        var instance = dataAccessor.Instance;\r\n        // The arkivmelding", migrated);
        Assert.DoesNotMatch("[^\r]\n", migrated);
    }

    [Fact]
    public async Task WithoutNullableContext_TheReceiverParameterIsUnannotated()
    {
        var path = Write("logic/EFormidlingReceivers.cs", ModelUsings + "\n\n" + V8Receivers);

        Migrate(semantic: false, nullableAnnotations: false);

        var migrated = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);
        Assert.Contains($"GetEFormidlingReceivers({AccessorType} dataAccessor, string receiverFromConfig)", migrated);
    }

    [Fact]
    public async Task AFileLevelNullableDirective_OverridesTheProjectDefault()
    {
        var enabled = Write(
            "logic/EnabledByDirective.cs",
            "#nullable enable\n" + ModelUsings + "\n\n" + V8Receivers.Replace("EFormidlingReceivers :", "Enabled :")
        );
        var disabled = Write(
            "logic/DisabledByDirective.cs",
            "#nullable disable\n" + ModelUsings + "\n\n" + V8Receivers.Replace("EFormidlingReceivers :", "Disabled :")
        );

        Migrate(semantic: false, nullableAnnotations: false);

        Assert.Contains(
            "string? receiverFromConfig",
            await File.ReadAllTextAsync(enabled, TestContext.Current.CancellationToken)
        );
        var disabledText = await File.ReadAllTextAsync(disabled, TestContext.Current.CancellationToken);
        Assert.Contains("string receiverFromConfig", disabledText);
        Assert.DoesNotContain("string? receiverFromConfig", disabledText);
    }

    [Theory]
    [InlineData("<Nullable>enable</Nullable>", true)]
    [InlineData("<Nullable>annotations</Nullable>", true)]
    [InlineData("<Nullable>warnings</Nullable>", false)]
    [InlineData("<Nullable>disable</Nullable>", false)]
    [InlineData("", false)]
    public void ProjectEnablesNullableAnnotations_ReadsCsprojNullableProperty(string property, bool expected)
    {
        var projectFile = _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
                {property}
              </PropertyGroup>
            </Project>
            """
        );

        Assert.Equal(expected, EFormidlingHookSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    [Fact]
    public void ProjectEnablesNullableAnnotations_FallsBackToNearestDirectoryBuildProps()
    {
        var projectFile = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
        _app.Write(
            "Directory.Build.props",
            """
            <Project>
              <PropertyGroup>
                <Nullable>enable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );

        Assert.True(EFormidlingHookSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    [Fact]
    public void ProjectEnablesNullableAnnotations_ProjectFileWinsOverDirectoryBuildProps()
    {
        var projectFile = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <Nullable>disable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );
        _app.Write(
            "Directory.Build.props",
            """
            <Project>
              <PropertyGroup>
                <Nullable>enable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );

        Assert.False(EFormidlingHookSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    [Fact]
    public async Task Upgrade_MigratesTheHooks_AndReportsWhatChanged()
    {
        // The whole upgrade, offline: no csproj bump and no compilation, so the syntax fallback does the work.
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.12.11" />
                <PackageReference Include="Altinn.App.Core" Version="8.12.11" />
              </ItemGroup>
            </Project>
            """
        );
        var metadata = Write("logic/EFormidlingMetadata.cs", ModelUsings + "\n\n" + V8Metadata);
        var receivers = Write("logic/EFormidlingReceivers.cs", ModelUsings + "\n\n" + V8Receivers);
        var report = new UpgradeReport();

        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var step = Assert.Single(report.Steps, static step => step.Name == "eFormidling metadata and receivers");
        Assert.Equal(2, step.Messages.Count(static message => message.Status == UpgradeMessageStatus.Warning));
        Assert.Contains(
            $"GenerateEFormidlingMetadata({AccessorType} dataAccessor)",
            await File.ReadAllTextAsync(metadata, TestContext.Current.CancellationToken)
        );
        Assert.Contains(
            $"GetEFormidlingReceivers({AccessorType} dataAccessor, string receiverFromConfig)",
            await File.ReadAllTextAsync(receivers, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task RemovedApiCheck_DoesNotReportTheDefaultReceiversTheRegistrationRewriteDropped()
    {
        // The internalized type detector binds against the pristine view, which still has the type argument the
        // registration rewrite dropped. Only a usage the app still has is reported.
        Write("logic/EFormidlingMetadata.cs", ModelUsings + "\n\n" + V8Metadata);
        Write(
            "Program.cs",
            """
            using Altinn.App.Core.EFormidling.Extensions;
            using Altinn.App.Core.EFormidling.Implementation;

            public static class Registration
            {
                public static void Register(object services, object configuration)
                {
                    services.AddEFormidlingServices2<EFormidlingMetadata, DefaultEFormidlingReceivers>(configuration);
                }
            }
            """
        );
        Write(
            "logic/Fallback.cs",
            """
            using Altinn.App.Core.EFormidling.Implementation;

            public class Fallback
            {
                public object Receivers { get; } = new DefaultEFormidlingReceivers();
            }
            """
        );
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );

        var output = new StringWriter();
        using var outputScope = UpgradeConsole.Use(output, output);
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder, _v8Sdk.Value);
        var registration = new EFormidlingRegistrationMigration(scanner).Migrate();
        Assert.Contains(registration.Warnings, static w => w.Contains("dropped the 'DefaultEFormidlingReceivers'"));

        await V8Tov9Upgrade.CheckRemovedCSharpApis(scanner, Path.Combine(AppFolder, "App.csproj"));

        var lines = output.ToString().Replace('\\', '/').Split('\n');
        Assert.DoesNotContain(
            lines,
            static line => line.Contains("Program.cs:") && line.Contains("DefaultEFormidlingReceivers")
        );
        Assert.Contains(
            lines,
            static line =>
                line.Contains("logic/Fallback.cs:5: DefaultEFormidlingReceivers (implements IEFormidlingReceivers)")
        );
    }
}
