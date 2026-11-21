using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the <c>IInstantiationProcessor.DataCreation(Instance, ...)</c> that v9 removes. The contract is "the
/// migrated app compiles against v9", so each rewrite is compiled against a v9-shaped stub; the text assertions pin
/// the layout the rewrite must keep. Most cases run both with a semantic model (the app compiled against v8) and
/// without (syntax fallback).
/// </summary>
public sealed class InstantiationProcessorSignatureMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private string Write(string relativePath, string content) =>
        _app.Write(relativePath, content.ReplaceLineEndings("\n"));

    private enum Sdk
    {
        /// <summary>The released v8 libraries: only the <c>Instance</c> member.</summary>
        V8Released,

        /// <summary>The last v8 shape: the mutator member defaults to the <c>Instance</c> one.</summary>
        V8,

        /// <summary>Only the mutator member, without a default.</summary>
        V9,
    }

    private static string SdkStub(Sdk sdk)
    {
        const string legacy = "Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill);";
        var members = sdk switch
        {
            Sdk.V8Released => legacy,
            Sdk.V8 => legacy
                + """

                            Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                                DataCreation(instanceDataMutator.Instance, data, prefill);
                    """,
            _ =>
                "Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill);",
        };
        return $$"""
            #nullable enable
            using System;
            using System.Collections.Generic;
            using System.IO;
            using System.Threading.Tasks;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance
                {
                    public string Id { get; set; } = "";
                }

                public class DataElement { }
            }

            namespace Altinn.App.Core.Internal.Data
            {
                public interface IDataClient
                {
                    Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string? filename, Stream stream);
                }
            }

            namespace Altinn.App.Core.Features
            {
                public interface IInstanceDataAccessor
                {
                    Instance Instance { get; }
                }

                public interface IInstanceDataMutator : IInstanceDataAccessor
                {
                    void AddBinaryDataElement(string dataTypeId, string contentType, string? filename, byte[] bytes);
                }

                public interface IInstantiationProcessor
                {
                    {{members}}
                }
            }
            """;
    }

    private static readonly Lazy<MetadataReference> _v8ReleasedSdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(Sdk.V8Released))
    );

    private static readonly Lazy<MetadataReference> _v8Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(Sdk.V8))
    );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(Sdk.V9))
    );

    /// <summary>The usings every fixture file needs; the v8 app template has no implicit usings.</summary>
    private const string Usings = """
        #nullable enable
        using System;
        using System.Collections.Generic;
        using System.IO;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Data;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    /// <summary>A v8 processor with a block body that uses the instance, and a doc comment naming the parameter.</summary>
    private const string BlockBodyProcessor = """
        public class Prefiller : IInstantiationProcessor
        {
            /// <summary>Prefills the model.</summary>
            /// <param name="instance">The instance</param>
            public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
            {
                // Copy the id into the model.
                await Task.CompletedTask;
                Console.WriteLine(instance.Id);
            }
        }
        """;

    private CSharpSourceScanner Scanner(bool semantic, MetadataReference? sdk = null) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, sdk ?? _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, MetadataReference? sdk = null) =>
        new InstantiationProcessorSignatureMigration(Scanner(semantic, sdk)).Migrate(
            TestContext.Current.CancellationToken
        );

    private void AssertCompilesAgainstV9()
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
    }

    private Task<string> Read(string path) => File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task BlockBody_GetsTheMutatorParameter_AndTheInstanceAsALocal(bool semantic)
    {
        var processor = Write("logic/Prefiller.cs", Usings + "\n" + BlockBodyProcessor);

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Prefiller.cs:", warning);
        Assert.Contains("Prefiller.DataCreation", warning);
        Assert.Contains("'IInstanceDataMutator instanceDataMutator'", warning);
        Assert.Contains("IDataClient", warning);
        AssertCompilesAgainstV9();
        Assert.Contains(
            """
                /// <param name="instanceDataMutator">The instance</param>
                public async Task DataCreation(global::Altinn.App.Core.Features.IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill)
                {
                    var instance = instanceDataMutator.Instance;
                    // Copy the id into the model.
                    await Task.CompletedTask;
            """.ReplaceLineEndings("\n"),
            await Read(processor)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExpressionBody_BecomesABlockThatReturnsTheExpression(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Prefill(instance, data);

                    private static Task Prefill(Instance instance, object data) => Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        Assert.Contains(
            """
                public Task DataCreation(global::Altinn.App.Core.Features.IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill)
                {
                    var instance = instanceDataMutator.Instance;
                    return Prefill(instance, data);
                }

                private static Task Prefill(Instance instance, object data) => Task.CompletedTask;
            """.ReplaceLineEndings("\n"),
            await Read(processor)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AsyncExpressionBody_BecomesABlockThatAwaitsTheExpression(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) => await Prefill(instance);

                    private static Task Prefill(Instance instance) => Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        Assert.Contains(
            """
                public async Task DataCreation(global::Altinn.App.Core.Features.IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill)
                {
                    var instance = instanceDataMutator.Instance;
                    await Prefill(instance);
                }
            """.ReplaceLineEndings("\n"),
            await Read(processor)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UnusedInstance_OnlyTheParameterChanges(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        var migrated = await Read(processor);
        Assert.Contains(
            "    public Task DataCreation(global::Altinn.App.Core.Features.IInstanceDataMutator instanceDataMutator, "
                + "object data, Dictionary<string, string>? prefill) =>\n"
                + "        Task.CompletedTask;\n",
            migrated
        );
        Assert.DoesNotContain(".Instance;", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitImplementation_GetsTheMutatorParameter(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    Task IInstantiationProcessor.DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                    {
                        Console.WriteLine(instance.Id);
                        return Task.CompletedTask;
                    }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        var migrated = await Read(processor);
        Assert.Contains(
            "Task IInstantiationProcessor.DataCreation(global::Altinn.App.Core.Features.IInstanceDataMutator "
                + "instanceDataMutator,",
            migrated
        );
        Assert.Contains("        var instance = instanceDataMutator.Instance;\n", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task NameCollision_PicksAnotherParameterName(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(Instance instanceDataMutator, object data, Dictionary<string, string>? prefill)
                    {
                        var dataMutator = instanceDataMutator.Id;
                        Console.WriteLine(dataMutator);
                        return Task.CompletedTask;
                    }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains("'IInstanceDataMutator mutator'", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        var migrated = await Read(processor);
        Assert.Contains("IInstanceDataMutator mutator, object data", migrated);
        Assert.Contains("        var instanceDataMutator = mutator.Instance;\n", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DataClientWrites_AreATodo(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller(IDataClient dataClient) : IInstantiationProcessor
                {
                    public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                    {
                        await dataClient.InsertBinaryData(instance.Id, "attachment", "text/plain", null, new MemoryStream());
                    }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("Prefiller.cs:13", todo);
        Assert.Contains("through IDataClient", todo);
        Assert.Contains("'instanceDataMutator'", todo);
        AssertCompilesAgainstV9();
        Assert.Contains("var instance = instanceDataMutator.Instance;", await Read(processor));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitLegacyBesideCurrent_IsRemoved(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill)
                    {
                        return Task.CompletedTask;
                    }

                    /// <summary>
                    /// Legacy method kept for backwards compatibility
                    /// </summary>
                    Task IInstantiationProcessor.DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                    {
                        throw new NotImplementedException();
                    }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains("removed", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        var migrated = await Read(processor);
        Assert.DoesNotContain("Legacy method", migrated);
        Assert.EndsWith("        return Task.CompletedTask;\n    }\n}", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ImplicitLegacyBesideCurrent_IsRemovedWhenNothingCallsIt(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains("removed", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        Assert.DoesNotContain("NotImplementedException", await Read(processor));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ImplicitLegacyBesideCurrent_StaysWhenTheAppCallsIt(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                        DataCreation(instanceDataMutator.Instance, data, prefill);

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );
        var before = await Read(processor);

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("It stays as the app's own method", warning);
        Assert.Contains("Prefiller.cs:12", warning);
        Assert.Equal(before, await Read(processor));
        AssertCompilesAgainstV9();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LegacyOnly_CallersOfTheChangedMethod_AreReported(bool semantic)
    {
        Write("logic/Prefiller.cs", Usings + "\n" + BlockBodyProcessor);
        var caller = Write(
            "logic/PrefillCheck.cs",
            Usings
                + """

                public static class PrefillCheck
                {
                    public static Task Run(Prefiller prefiller, Instance instance) =>
                        prefiller.DataCreation(instance, new object(), null);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Single(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("PrefillCheck.cs:12", todo);
        Assert.Contains("Prefiller.DataCreation", todo);
        Assert.Contains("pass an IInstanceDataMutator", todo);
        Assert.Contains("prefiller.DataCreation(instance, new object(), null)", await Read(caller));
    }

    [Fact]
    public void WithSemantics_CallThroughTheInterface_IsReported()
    {
        Write(
            "logic/PrefillCheck.cs",
            Usings
                + """

                public static class PrefillCheck
                {
                    public static Task Run(IInstantiationProcessor processor, Instance instance) =>
                        processor.DataCreation(instance, new object(), null);
                }
                """
        );

        var result = Migrate(semantic: true);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("PrefillCheck.cs:12", todo);
        Assert.Contains("removed IInstantiationProcessor.DataCreation(Instance", todo);
    }

    [Fact]
    public async Task WithSemantics_ImplementationInAnAppBaseClass_IsMigratedOnce()
    {
        var baseClass = Write(
            "logic/PrefillerBase.cs",
            Usings
                + """

                public abstract class PrefillerBase : IInstantiationProcessor
                {
                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                    {
                        Console.WriteLine(Target + instance.Id);
                        return Task.CompletedTask;
                    }

                    protected abstract string Target { get; }
                }
                """
        );
        Write(
            "logic/Prefillers.cs",
            Usings
                + """

                public class FirstPrefiller : PrefillerBase
                {
                    protected override string Target => "first";
                }

                public class SecondPrefiller : PrefillerBase
                {
                    protected override string Target => "second";
                }
                """
        );

        var result = Migrate(semantic: true);

        Assert.Empty(result.Todos);
        Assert.Contains("PrefillerBase.DataCreation", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        Assert.Contains("IInstanceDataMutator instanceDataMutator,", await Read(baseClass));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task VirtualLegacy_IsReportedInsteadOfRewritten(bool semantic)
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public virtual Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );
        var before = await Read(processor);

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        Assert.Contains("override family", Assert.Single(result.Todos));
        Assert.Equal(before, await Read(processor));
    }

    [Fact]
    public async Task WithoutSemantics_AppsOwnInterfaceOfTheSameName_IsReportedInsteadOfRewritten()
    {
        Write(
            "logic/IInstantiationProcessor.cs",
            Usings
                + """

                namespace MyApp
                {
                    public interface IInstantiationProcessor
                    {
                        Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill);
                    }
                }
                """
        );
        var processor = Write(
            "logic/OwnProcessor.cs",
            Usings
                + """

                namespace MyApp
                {
                    public class OwnProcessor : IInstantiationProcessor
                    {
                        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                            Task.CompletedTask;
                    }
                }
                """
        );
        var before = await Read(processor);

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("OwnProcessor.DataCreation", todo);
        Assert.Contains("app's own interface", todo);
        Assert.Equal(before, await Read(processor));
    }

    [Fact]
    public async Task WithReleasedV8Semantics_LegacyOnly_GetsTheMutatorParameter()
    {
        var processor = Write("logic/Prefiller.cs", Usings + "\n" + BlockBodyProcessor);

        var result = Migrate(semantic: true, _v8ReleasedSdk.Value);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        Assert.Contains("var instance = instanceDataMutator.Instance;", await Read(processor));
    }

    [Fact]
    public async Task WithReleasedV8Semantics_LegacyBesideTheAppsOwnMutatorMethod_IsRemoved()
    {
        var processor = Write(
            "logic/Prefiller.cs",
            Usings
                + """

                public class Prefiller : IInstantiationProcessor
                {
                    public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic: true, _v8ReleasedSdk.Value);

        Assert.Empty(result.Todos);
        Assert.Contains("removed", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        Assert.DoesNotContain("Instance instance", await Read(processor));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MigratedOutput_IsLeftAlone(bool semantic)
    {
        var processor = Write("logic/Prefiller.cs", Usings + "\n" + BlockBodyProcessor);
        Migrate(semantic);
        var migrated = await Read(processor);

        // A resumed upgrade has no v8 compilation of the migrated app: it compiles against v9 only.
        var syntactic = Migrate(semantic: false);
        var againstV9 = Migrate(semantic: true, _v9Sdk.Value);

        Assert.Empty(syntactic.Messages);
        Assert.Empty(againstV9.Messages);
        Assert.Equal(migrated, await Read(processor));
    }
}
