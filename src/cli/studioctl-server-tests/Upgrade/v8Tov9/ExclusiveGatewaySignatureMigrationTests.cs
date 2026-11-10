using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the three-parameter <c>IProcessExclusiveGateway.FilterAsync</c> that v9 removes. The contract is "the
/// migrated app compiles against v9", so each rewrite is run through the Async suffix step that follows it in the
/// upgrade and compiled against a v9-shaped stub; the text assertions pin the layout the rewrite must keep. Most
/// cases run both with a semantic model (the app compiled against v8) and without (syntax fallback).
/// </summary>
public sealed class ExclusiveGatewaySignatureMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private string Write(string relativePath, string content) =>
        _app.Write(relativePath, content.ReplaceLineEndings("\n"));

    /// <summary>
    /// The gateway surface in its v8 shape, where the four-parameter member defaults to the three-parameter one, or
    /// its v9 shape, where only the four-parameter member is left and the suffix is gone.
    /// </summary>
    private static string SdkStub(bool v9)
    {
        var members = v9
            ? """
                        Task<List<SequenceFlow>> Filter(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation);
                """
            : """
                        Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation)
                        {
                            return FilterAsync(outgoingFlows, instance, processGatewayInformation);
                        }

                        Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation);
                """;
        return $$"""
            #nullable enable
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Internal.Process.Elements;
            using Altinn.App.Core.Models.Process;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance { }
            }

            namespace Altinn.App.Core.Internal.Process.Elements
            {
                public class SequenceFlow
                {
                    public string TargetRef { get; set; } = "";
                }
            }

            namespace Altinn.App.Core.Models.Process
            {
                public class ProcessGatewayInformation { }
            }

            namespace Altinn.App.Core.Features
            {
                public interface IInstanceDataAccessor { }

                public interface IProcessExclusiveGateway
                {
                    string GatewayId { get; }

            {{members}}
                }
            }
            """;
    }

    private static readonly Lazy<MetadataReference> _v8Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: true))
    );

    /// <summary>The usings every fixture file needs; the v8 app template has no implicit usings.</summary>
    private const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Process.Elements;
        using Altinn.App.Core.Models.Process;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    /// <summary>A v8 gateway with only the three-parameter method, one parameter per line.</summary>
    private const string LegacyOnlyGateway = """
        public class HasAuditorGateway : IProcessExclusiveGateway
        {
            public string GatewayId => "Gateway_HasAuditor";

            public async Task<List<SequenceFlow>> FilterAsync(
                List<SequenceFlow> outgoingFlows,
                Instance instance, // the instance about to move
                ProcessGatewayInformation processGatewayInformation
            )
            {
                await Task.CompletedTask;
                return outgoingFlows.FindAll(flow => flow.TargetRef == "EndEvent_1");
            }
        }
        """;

    /// <summary>A v8 gateway that implements both members, the three-parameter one explicitly, as the libraries did.</summary>
    private const string BothMembersGateway = """
        public class RoutingGateway : IProcessExclusiveGateway
        {
            public string GatewayId => "Gateway_Routing";

            public Task<List<SequenceFlow>> FilterAsync(
                List<SequenceFlow> outgoingFlows,
                Instance instance,
                IInstanceDataAccessor dataAccessor,
                ProcessGatewayInformation processGatewayInformation
            )
            {
                return Task.FromResult(outgoingFlows);
            }

            /// <summary>
            /// Legacy method kept for backwards compatibility
            /// </summary>
            Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
                List<SequenceFlow> outgoingFlows,
                Instance instance,
                ProcessGatewayInformation processGatewayInformation
            )
            {
                throw new NotImplementedException();
            }
        }
        """;

    private CSharpSourceScanner Scanner(bool semantic) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic) =>
        new ExclusiveGatewaySignatureMigration(Scanner(semantic)).Migrate(TestContext.Current.CancellationToken);

    /// <summary>Runs this step and the Async suffix step that follows it in the upgrade, on one scanner, as the upgrade does.</summary>
    private MigrationResult MigrateThroughAsyncSuffix(bool semantic)
    {
        var scanner = Scanner(semantic);
        var result = new ExclusiveGatewaySignatureMigration(scanner).Migrate(TestContext.Current.CancellationToken);
        new AsyncSuffixApiMigration(scanner).Migrate();
        return result;
    }

    private void AssertCompilesAgainstV9()
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LegacyOnly_GetsTheParameter_AndCompilesAgainstV9(bool semantic)
    {
        var gateway = Write("logic/HasAuditorGateway.cs", Usings + "\n" + LegacyOnlyGateway);

        var result = MigrateThroughAsyncSuffix(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("HasAuditorGateway.cs:", warning);
        Assert.Contains("HasAuditorGateway.FilterAsync", warning);
        Assert.Contains("'dataAccessor'", warning);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        // One parameter per line stays that way, the comment stays on its line, and the type is qualified for the
        // final pass to simplify.
        Assert.Contains(
            "        Instance instance, // the instance about to move\n"
                + "        global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor,\n"
                + "        ProcessGatewayInformation processGatewayInformation\n"
                + "    )",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LegacyOnly_SingleLineParameters_StayOnOneLine(bool semantic)
    {
        var gateway = Write(
            "logic/OneLineGateway.cs",
            Usings
                + """

                public class OneLineGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_1";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );

        var result = MigrateThroughAsyncSuffix(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        Assert.Contains(
            "(List<SequenceFlow> outgoingFlows, Instance instance, "
                + "global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor, "
                + "ProcessGatewayInformation processGatewayInformation) =>",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitLegacyOnly_GetsTheParameter(bool semantic)
    {
        var gateway = Write(
            "logic/ExplicitGateway.cs",
            Usings
                + """

                public class ExplicitGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_1";

                    Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
                        List<SequenceFlow> outgoingFlows,
                        Instance instance,
                        ProcessGatewayInformation processGatewayInformation
                    ) => Task.FromResult(outgoingFlows);
                }
                """
        );

        var result = MigrateThroughAsyncSuffix(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        Assert.Contains("global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor,", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitLegacyBesideCurrent_IsRemoved(bool semantic)
    {
        var gateway = Write("logic/RoutingGateway.cs", Usings + "\n" + BothMembersGateway);

        var result = MigrateThroughAsyncSuffix(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("RoutingGateway.FilterAsync", warning);
        Assert.Contains("removed", warning);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("IProcessExclusiveGateway.Filter", migrated);
        Assert.DoesNotContain("Legacy method", migrated);
        Assert.DoesNotContain("NotImplementedException", migrated);
        // The method and its doc comment go; the member before it keeps its closing line, and no blank line is left.
        Assert.EndsWith("        return Task.FromResult(outgoingFlows);\n    }\n}", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ImplicitLegacyBesideCurrent_IsRemovedWhenNothingCallsIt(bool semantic)
    {
        var gateway = Write(
            "logic/RoutingGateway.cs",
            Usings
                + """

                public class RoutingGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_Routing";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        throw new NotImplementedException();
                }
                """
        );

        var result = MigrateThroughAsyncSuffix(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("removed", warning);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("NotImplementedException", migrated);
    }

    [Fact]
    public async Task ImplicitLegacyBesideCurrent_StaysWhenTheAppCallsIt()
    {
        var gateway = Write(
            "logic/RoutingGateway.cs",
            Usings
                + """

                public class RoutingGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_Routing";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation) =>
                        FilterAsync(outgoingFlows, instance, processGatewayInformation);

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var result = Migrate(semantic: true);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("It stays as the app's own method", warning);
        Assert.Contains("RoutingGateway.cs:13", warning);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LegacyOnly_CallersOfTheChangedMethod_AreReported(bool semantic)
    {
        Write("logic/HasAuditorGateway.cs", Usings + "\n" + LegacyOnlyGateway);
        var caller = Write(
            "logic/GatewayCheck.cs",
            Usings
                + """

                public static class GatewayCheck
                {
                    public static Task<List<SequenceFlow>> Run(HasAuditorGateway gateway, Instance instance) =>
                        gateway.FilterAsync(new List<SequenceFlow>(), instance, new ProcessGatewayInformation());
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Single(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("GatewayCheck.cs:11", todo);
        Assert.Contains("HasAuditorGateway.FilterAsync", todo);
        Assert.Contains("pass an IInstanceDataAccessor", todo);
        // The call itself is for the developer: it needs an accessor the upgrade cannot conjure.
        Assert.Contains(
            "gateway.FilterAsync(new List<SequenceFlow>(), instance, new ProcessGatewayInformation())",
            await File.ReadAllTextAsync(caller, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public void WithSemantics_CallThroughTheInterface_IsReported()
    {
        Write(
            "logic/GatewayCheck.cs",
            Usings
                + """

                public static class GatewayCheck
                {
                    public static Task<List<SequenceFlow>> Run(IProcessExclusiveGateway gateway, Instance instance) =>
                        gateway.FilterAsync(new List<SequenceFlow>(), instance, new ProcessGatewayInformation());
                }
                """
        );

        var result = Migrate(semantic: true);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("GatewayCheck.cs:11", todo);
        Assert.Contains("removed three-parameter IProcessExclusiveGateway.FilterAsync", todo);
    }

    [Fact]
    public async Task WithSemantics_ImplementationInAnAppBaseClass_IsMigratedOnce()
    {
        var baseClass = Write(
            "logic/GatewayBase.cs",
            Usings
                + """

                public abstract class GatewayBase : IProcessExclusiveGateway
                {
                    public abstract string GatewayId { get; }

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows.FindAll(flow => flow.TargetRef == Target));

                    protected abstract string Target { get; }
                }
                """
        );
        Write(
            "logic/Gateways.cs",
            Usings
                + """

                public class FirstGateway : GatewayBase
                {
                    public override string GatewayId => "Gateway_1";
                    protected override string Target => "Task_1";
                }

                public class SecondGateway : GatewayBase
                {
                    public override string GatewayId => "Gateway_2";
                    protected override string Target => "Task_2";
                }
                """
        );

        var result = MigrateThroughAsyncSuffix(semantic: true);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("GatewayBase.FilterAsync", warning);
        AssertCompilesAgainstV9();
        Assert.Contains(
            "IInstanceDataAccessor dataAccessor,",
            await File.ReadAllTextAsync(baseClass, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task VirtualLegacy_IsReportedInsteadOfRewritten(bool semantic)
    {
        var gateway = Write(
            "logic/OpenGateway.cs",
            Usings
                + """

                public class OpenGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_1";

                    public virtual Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("OpenGateway.FilterAsync", todo);
        Assert.Contains("override family", todo);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task WithoutSemantics_AppsOwnInterfaceOfTheSameName_IsReportedInsteadOfRewritten()
    {
        Write(
            "logic/IProcessExclusiveGateway.cs",
            Usings
                + """

                namespace MyApp
                {
                    public interface IProcessExclusiveGateway
                    {
                        Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation);
                    }
                }
                """
        );
        var gateway = Write(
            "logic/OwnGateway.cs",
            Usings
                + """

                namespace MyApp
                {
                    public class OwnGateway : IProcessExclusiveGateway
                    {
                        public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                            Task.FromResult(outgoingFlows);
                    }
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("OwnGateway.FilterAsync", todo);
        Assert.Contains("app's own interface", todo);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task AlreadyOnTheFourParameterMethod_IsLeftAlone()
    {
        var gateway = Write(
            "logic/DoneGateway.cs",
            Usings
                + """

                public class DoneGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_1";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        // A resumed upgrade of an app already on the v9 shape has no v8 compilation to bind against.
        var result = Migrate(semantic: false);

        Assert.Empty(result.Messages);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }
}
