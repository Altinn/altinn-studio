using Altinn.App.Analyzers.Tests.Fixtures;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests;

[Collection(nameof(AltinnTestAppCollection))]
public class MutatorStorageClientUsageAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnTestAppFixture _fixture;

    public MutatorStorageClientUsageAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
    {
        fixture.SetTestOutputHelper(output);
        _fixture = fixture;
    }

    public async Task InitializeAsync() => await _fixture.Initialize();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Builds_OK_By_Default()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new MutatorStorageClientUsageAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics_For_Direct_Storage_Clients_On_Mutator_Surfaces()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var _ = _fixture.WithCode(
            """
                using System;
                using System.Collections.Generic;
                using System.IO;
                using System.Threading.Tasks;
                using Altinn.App.Core.EFormidling.Interface;
                using Altinn.App.Core.Features;
                using Altinn.App.Core.Features.Process;
                using Altinn.App.Core.Features.Signing;
                using Altinn.App.Core.Internal.Data;
                using Altinn.App.Core.Internal.Instances;
                using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
                using Altinn.App.Core.Internal.Process.ProcessTasks;
                using Altinn.App.Core.Models;
                using Altinn.App.Core.Models.UserAction;
                using Altinn.Platform.Storage.Interface.Models;

                namespace Altinn.App.Models.logic;

                internal sealed class ProcessTaskWithConstructorInjection : IProcessTask
                {
                    public string Type => "data";

                    public ProcessTaskWithConstructorInjection(IDataClient dataClient) { }
                }

                internal sealed class ServiceTaskWithPrimaryConstructor(IInstanceClient instanceClient) : IServiceTask
                {
                    public string Type => "service";

                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
                        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                }

                internal sealed class DataWriteProcessorWithMembers : IDataWriteProcessor
                {
                    private readonly IDataClient _dataClient = null!;

                    public IInstanceClient InstanceClient { get; init; } = null!;

                    public Task ProcessDataWrite(
                        IInstanceDataMutator instanceDataMutator,
                        string taskId,
                        DataElementChanges changes,
                        string? language
                    ) => Task.CompletedTask;
                }

                internal sealed class TaskStartingHandlerWithMethodParameter : IOnTaskStartingHandler
                {
                    public bool ShouldRunForTask(string taskId) => true;

                    public Task<OnTaskStartingHandlerResult> ExecuteAsync(OnTaskStartingContext context) =>
                        Task.FromResult<OnTaskStartingHandlerResult>(OnTaskStartingHandlerResult.Success());

                    public Task Helper(IDataClient dataClient) => Task.CompletedTask;
                }

                internal sealed class LegacyDataProcessorWithConstructor(IInstanceClient instanceClient) : IDataProcessor
                {
                    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language) =>
                        Task.CompletedTask;

                    public Task ProcessDataWrite(
                        Instance instance,
                        Guid? dataId,
                        object data,
                        object? previousData,
                        string? language
                    ) => Task.CompletedTask;
                }

                internal sealed class UserActionWithStorageClient(IDataClient dataClient) : IUserAction
                {
                    public string Id => "unsafe-action";

                    public Task<UserActionResult> HandleAction(UserActionContext context) =>
                        Task.FromResult(UserActionResult.SuccessResult());
                }

                internal sealed class InstantiationProcessorWithStorageClient(IDataClient dataClient)
                    : IInstantiationProcessor
                {
                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }

                internal sealed class ContextHelperWithConstructorInjection(IDataClient dataClient)
                {
                    public Task Run(UserActionContext context) => Task.CompletedTask;
                }

                internal sealed class EFormidlingMetadataWithStorageClient(IDataClient dataClient)
                    : IEFormidlingMetadata
                {
                    public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(
                        Instance instance,
                        IInstanceDataAccessor? dataAccessor = null
                    ) => Task.FromResult(("metadata.xml", Stream.Null));
                }

                internal sealed class EFormidlingServiceWithStorageClient(IInstanceClient instanceClient)
                    : IEFormidlingService
                {
                    public Task SendEFormidlingShipment(
                        Instance instance,
                        ValidAltinnEFormidlingConfiguration configuration,
                        IInstanceDataAccessor? dataAccessor = null
                    ) => Task.CompletedTask;
                }

                internal sealed class ContextHelperWithMembers
                {
                    private readonly IInstanceClient _instanceClient = null!;

                    public IDataClient DataClient { get; init; } = null!;

                    public Task Run(UserActionContext context) => Task.CompletedTask;
                }

                internal sealed class MethodWithContextAndDirectClient
                {
                    public Task Run(UserActionContext context, IDataClient dataClient) => Task.CompletedTask;
                }
            """
        );
        var analyzer = new MutatorStorageClientUsageAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Equal(14, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.CodeSmells.MutatorStorageClientUsage.Id, d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Does_Not_Emit_For_Safe_Classes_Or_Direct_Clients_Outside_Mutator_Surfaces()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var _ = _fixture.WithCode(
            """
                using System.Threading.Tasks;
                using Altinn.App.Core.Features;
                using Altinn.App.Core.Features.Process;
                using Altinn.App.Core.Features.Signing;
                using Altinn.App.Core.Internal.Data;
                using Altinn.App.Core.Internal.Instances;
                using Altinn.App.Core.Internal.Process.ProcessTasks;
                using Altinn.App.Core.Models.UserAction;

                namespace Altinn.App.Models.logic;

                internal sealed class SafeProcessTask : IProcessTask
                {
                    public string Type => "data";

                    public Task Start(ProcessTaskContext context)
                    {
                        _ = context.InstanceDataMutator.Instance;
                        return Task.CompletedTask;
                    }
                }

                internal sealed class SafeUserAction : IUserAction
                {
                    public string Id => "safe-action";

                    public Task<UserActionResult> HandleAction(UserActionContext context)
                    {
                        _ = context.DataMutator.Instance;
                        return Task.FromResult(UserActionResult.SuccessResult());
                    }
                }

                internal sealed class SafeSigneeProvider : ISigneeProvider
                {
                    public string Id { get; init; } = "safe-provider";

                    public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters)
                    {
                        _ = parameters.InstanceDataAccessor.Instance;
                        return Task.FromResult(new SigneeProviderResult { Signees = [] });
                    }
                }

                internal sealed class DirectStorageOutsideMutatorSurface(IDataClient dataClient)
                {
                    private readonly IInstanceClient _instanceClient = null!;

                    public Task Helper(IDataClient dataClient) => Task.CompletedTask;
                }

                internal sealed class MethodsThatDoNotCombineContextsAndStorageClients
                {
                    public Task WithAccessorOnly(IInstanceDataAccessor accessor) => Task.CompletedTask;

                    public Task WithStorageOnly(IDataClient dataClient) => Task.CompletedTask;
                }
            """
        );
        var analyzer = new MutatorStorageClientUsageAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Does_Not_Emit_When_Project_Is_Not_Altinn_App()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var _ = _fixture.WithCode(
            """
                using System.Threading.Tasks;
                using Altinn.App.Core.Features;
                using Altinn.App.Core.Internal.Data;
                using Altinn.App.Core.Models.UserAction;

                namespace Altinn.App.Models.logic;

                internal sealed class UserActionWithStorageClient(IDataClient dataClient) : IUserAction
                {
                    public string Id => "unsafe-action";

                    public Task<UserActionResult> HandleAction(UserActionContext context) =>
                        Task.FromResult(UserActionResult.SuccessResult());
                }
            """
        );
        var analyzer = new MutatorStorageClientUsageAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken, isAltinnApp: false);

        Assert.Empty(diagnostics);
    }
}
