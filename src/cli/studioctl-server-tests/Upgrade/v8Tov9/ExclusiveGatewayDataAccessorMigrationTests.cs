using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the <c>IInstanceDataAccessor dataAccessor</c> parameter app gateways need once v9 removed the
/// <c>IProcessExclusiveGateway.FilterAsync</c> overload without it. The engine shared with
/// <see cref="CancellationTokenParameterMigrationTests"/> is covered there; these cases cover what is particular to
/// gateways: the parameter goes in the middle of the list, and a v8 gateway can implement both overloads. Every
/// rewrite is compiled against a v9-shaped stub.
/// </summary>
public sealed class ExclusiveGatewayDataAccessorMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private string Write(string relativePath, string content) =>
        _app.Write(relativePath, content.ReplaceLineEndings("\n"));

    /// <summary>
    /// The gateway surface in its v8 shape (both overloads, the new one defaulting to the old) or its v9 shape
    /// (only the new one). Only the interfaces' assembly matters to the migration, so one stub holds every type.
    /// </summary>
    private static string SdkStub(bool v9)
    {
        var overloads = v9
            ? """
                Task<List<SequenceFlow>> FilterAsync(
                    List<SequenceFlow> outgoingFlows,
                    Instance instance,
                    IInstanceDataAccessor dataAccessor,
                    ProcessGatewayInformation processGatewayInformation
                );
                """
            : """
                Task<List<SequenceFlow>> FilterAsync(
                    List<SequenceFlow> outgoingFlows,
                    Instance instance,
                    IInstanceDataAccessor dataAccessor,
                    ProcessGatewayInformation processGatewayInformation
                ) => FilterAsync(outgoingFlows, instance, processGatewayInformation);

                Task<List<SequenceFlow>> FilterAsync(
                    List<SequenceFlow> outgoingFlows,
                    Instance instance,
                    ProcessGatewayInformation processGatewayInformation
                );
                """;
        return $$"""
            #nullable enable
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.App.Core.Internal.Process.Elements;
            using Altinn.App.Core.Models.Process;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance { }
            }

            namespace Altinn.App.Core.Internal.Process.Elements
            {
                public class SequenceFlow { }
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

                    {{overloads}}
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

    private const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Process.Elements;
        using Altinn.App.Core.Models.Process;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    private CSharpSourceScanner Scanner(bool semantic, MetadataReference? sdk = null) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, sdk ?? _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, MetadataReference? sdk = null) =>
        new ExclusiveGatewayDataAccessorMigration(Scanner(semantic, sdk)).Migrate(
            TestContext.Current.CancellationToken
        );

    private void AssertCompilesAgainstV9()
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GatewayWithTheOldOverload_GetsTheDataAccessorBeforeTheGatewayInformation(bool semantic)
    {
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("HasAuditorGateway.cs:", warning);
        Assert.Contains("HasAuditorGateway.FilterAsync", warning);
        Assert.Contains("IProcessExclusiveGateway", warning);
        Assert.Contains("IDataClient", warning);
        AssertCompilesAgainstV9();
        Assert.Contains(
            "(List<SequenceFlow> outgoingFlows, Instance instance, global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation) =>",
            await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task MultiLineParameterList_GetsTheDataAccessorOnItsOwnLine()
    {
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    public async Task<List<SequenceFlow>> FilterAsync(
                        List<SequenceFlow> outgoingFlows,
                        Instance instance,
                        ProcessGatewayInformation processGatewayInformation
                    )
                    {
                        return await Task.FromResult(outgoingFlows);
                    }
                }
                """
        );

        Migrate(semantic: true);

        AssertCompilesAgainstV9();
        Assert.Contains(
            "        Instance instance,\n        global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor,\n        ProcessGatewayInformation processGatewayInformation\n    )\n",
            await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitImplementationOfTheOldOverload_GetsTheDataAccessor(bool semantic)
    {
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        Assert.Contains(
            "IProcessExclusiveGateway.FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, global::Altinn.App.Core.Features.IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation)",
            await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GatewayWithBothOverloads_LosesItsExplicitImplementationOfTheOldOne(bool semantic)
    {
        // v8 required the old overload even from a gateway that implemented the new one, so it was often an
        // explicit stub. v9 no longer has that member, so the stub no longer compiles.
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    public Task<List<SequenceFlow>> FilterAsync(
                        List<SequenceFlow> outgoingFlows,
                        Instance instance,
                        IInstanceDataAccessor dataAccessor,
                        ProcessGatewayInformation processGatewayInformation
                    ) => Task.FromResult(outgoingFlows);

                    /// <summary>The old overload, which the app library no longer calls.</summary>
                    Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
                        List<SequenceFlow> outgoingFlows,
                        Instance instance,
                        ProcessGatewayInformation processGatewayInformation
                    ) => throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("removed", warning);
        Assert.Contains("HasAuditorGateway.FilterAsync", warning);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("IProcessExclusiveGateway.FilterAsync", migrated);
        Assert.DoesNotContain("The old overload", migrated);
        Assert.EndsWith("    ) => Task.FromResult(outgoingFlows);\n}", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GatewayWithBothOverloadsPublic_IsLeftAsItIsWithAWarning(bool semantic)
    {
        // The old overload still compiles as an ordinary method, and the app may call it itself.
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, IInstanceDataAccessor dataAccessor, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Remove it unless the app calls it itself", warning);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
        AssertCompilesAgainstV9();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task GatewayAlreadyUsingTheName_IsReportedInsteadOfRewritten(bool semantic)
    {
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    private readonly object _dataAccessor = new();

                    public string GatewayId => "Gateway_HasAuditor";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation)
                    {
                        var dataAccessor = _dataAccessor;
                        return Task.FromResult(outgoingFlows);
                    }
                }
                """
        );
        var before = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        var todo = Assert.Single(result.Todos);
        Assert.Contains("already uses the name 'dataAccessor'", todo);
        Assert.Equal(before, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task RunningAgain_ChangesNothing()
    {
        var gateway = Write(
            "logic/HasAuditorGateway.cs",
            Usings
                + """

                public class HasAuditorGateway : IProcessExclusiveGateway
                {
                    public string GatewayId => "Gateway_HasAuditor";

                    public Task<List<SequenceFlow>> FilterAsync(List<SequenceFlow> outgoingFlows, Instance instance, ProcessGatewayInformation processGatewayInformation) =>
                        Task.FromResult(outgoingFlows);
                }
                """
        );
        Migrate(semantic: true);
        var migrated = await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken);

        var withoutModel = Migrate(semantic: false);
        var againstV9 = Migrate(semantic: true, sdk: _v9Sdk.Value);

        Assert.Empty(withoutModel.Messages);
        Assert.Empty(againstV9.Messages);
        Assert.Equal(migrated, await File.ReadAllTextAsync(gateway, TestContext.Current.CancellationToken));
    }
}
