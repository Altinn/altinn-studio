using System.Net;
using System.Text.Json;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public sealed class DataControllerRowIdTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 501337;

    public DataControllerRowIdTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task GetWithRowIds_WhenNonIdle_ReturnsStoredRowsWithoutWritingAndStillRunsReadHook(
        ProcessStatus status
    )
    {
        TestState state = CreateState(status);
        var storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        var instanceClient = CreateInstanceClient(state);
        var dataProcessor = new Mock<IDataProcessor>(MockBehavior.Strict);
        dataProcessor
            .Setup(processor =>
                processor.ProcessDataRead(It.IsAny<Instance>(), state.DataElementId, It.IsAny<Skjema>(), language: null)
            )
            .Callback<Instance, Guid?, object, string?>(
                (_, _, model, _) =>
                {
                    var typedModel = Assert.IsType<Skjema>(model);
                    Assert.Equal(Guid.Empty, GetOnlyRow(typedModel).AltinnRowId);
                    typedModel.Melding!.Name = "from-read-hook";
                }
            )
            .Returns(Task.CompletedTask);

        using HttpClient client = CreateClient(dataClient, instanceClient, dataProcessor);
        Skjema responseModel = await GetModel(client, state, includeRowId: true);

        Assert.Equal("from-read-hook", responseModel.Melding!.Name);
        Assert.Equal(Guid.Empty, GetOnlyRow(responseModel).AltinnRowId);
        Assert.Equal(Guid.Empty, GetOnlyRow(storedModel).AltinnRowId);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        dataProcessor.VerifyAll();
    }

    [Fact]
    public async Task GetWithRowIds_WhenIdle_InitializesPersistsAndReturnsStableRows()
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.Is<DataElement>(element => element.Id == state.DataElementId.ToString()),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<Instance, object, DataElement, StorageAuthenticationMethod?, CancellationToken>(
                (_, updatedModel, dataElement, _, _) =>
                {
                    storedModel = Clone(Assert.IsType<Skjema>(updatedModel));
                    return Task.FromResult(dataElement);
                }
            );
        var instanceClient = CreateInstanceClient(state);

        using HttpClient client = CreateClient(dataClient, instanceClient);
        Skjema firstResponse = await GetModel(client, state, includeRowId: true);
        Skjema secondResponse = await GetModel(client, state, includeRowId: true);

        Guid persistedRowId = GetOnlyRow(storedModel).AltinnRowId;
        Assert.NotEqual(Guid.Empty, persistedRowId);
        Assert.Equal(persistedRowId, GetOnlyRow(firstResponse).AltinnRowId);
        Assert.Equal(persistedRowId, GetOnlyRow(secondResponse).AltinnRowId);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task GetWithRowIds_WhenAcquireWinsPersistenceRace_ReturnsInitializedSnapshotWithoutRetrying(
        ProcessStatus acquiredStatus
    )
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() =>
            {
                state.Instance.Process!.Status = acquiredStatus;
                return Task.FromException<DataElement>(CreatePlatformException(HttpStatusCode.Conflict));
            });
        var instanceClient = CreateInstanceClient(state);
        SetupInstanceRefresh(instanceClient, state);

        using HttpClient client = CreateClient(dataClient, instanceClient);
        Skjema racingResponse = await GetModel(client, state, includeRowId: true);

        Assert.NotEqual(Guid.Empty, GetOnlyRow(racingResponse).AltinnRowId);
        Assert.Equal(Guid.Empty, GetOnlyRow(storedModel).AltinnRowId);

        Skjema subsequentResponse = await GetModel(client, state, includeRowId: true);

        Assert.Equal(Guid.Empty, GetOnlyRow(subsequentResponse).AltinnRowId);
        Assert.Equal(Guid.Empty, GetOnlyRow(storedModel).AltinnRowId);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWithRowIds_WhenPersistenceConflictLeavesInstanceIdle_PropagatesOriginalConflictWithoutRetry()
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() => Task.FromException<DataElement>(CreatePlatformException(HttpStatusCode.Conflict)));
        var instanceClient = CreateInstanceClient(state);
        SetupInstanceRefresh(instanceClient, state);

        using HttpClient client = CreateClient(dataClient, instanceClient);
        using HttpResponseMessage response = await client.GetAsync(GetUrl(state, includeRowId: true));

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        Assert.Equal(Guid.Empty, GetOnlyRow(storedModel).AltinnRowId);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWithRowIds_WhenRefreshFails_PreservesOriginalConflictWithoutRetry()
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() => Task.FromException<DataElement>(CreatePlatformException(HttpStatusCode.Conflict)));
        var instanceClient = CreateInstanceClient(state);
        instanceClient
            .Setup(client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Refresh failed"));

        using HttpClient client = CreateClient(dataClient, instanceClient);
        using HttpResponseMessage response = await client.GetAsync(GetUrl(state, includeRowId: true));

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWithRowIds_WhenCallerCancelsDuringConflictRefresh_PropagatesCancellation()
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() => Task.FromException<DataElement>(CreatePlatformException(HttpStatusCode.Conflict)));
        var instanceClient = CreateInstanceClient(state);
        using var cancellationSource = new CancellationTokenSource();
        cancellationSource.Cancel();
        CancellationToken cancellationToken = cancellationSource.Token;
        instanceClient
            .Setup(client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    cancellationToken
                )
            )
            .ThrowsAsync(new OperationCanceledException(cancellationToken));
        var formDataReader = new Mock<IFormDataReader>(MockBehavior.Strict);
        formDataReader
            .Setup(reader =>
                reader.ProcessLoadedFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    true,
                    It.IsAny<string?>(),
                    It.IsAny<Func<object, CancellationToken, Task>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<
                Instance,
                DataElement,
                object?,
                bool,
                string?,
                Func<object, CancellationToken, Task>?,
                CancellationToken
            >(
                async (_, _, model, _, _, persistFormData, _) =>
                {
                    Assert.NotNull(model);
                    Assert.NotNull(persistFormData);
                    await persistFormData(model, cancellationToken);
                    return model;
                }
            );

        using HttpClient client = CreateClient(dataClient, instanceClient, formDataReader: formDataReader);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.GetAsync(GetUrl(state, includeRowId: true))
        );
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    cancellationToken
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    cancellationToken
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWithRowIds_WhenPersistenceFailsWithoutConflict_PropagatesWithoutRefreshing()
    {
        TestState state = CreateState(ProcessStatus.Idle);
        Skjema storedModel = CreateModel();
        var dataClient = CreateDataClient(state, () => storedModel);
        dataClient
            .Setup(client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() =>
                Task.FromException<DataElement>(CreatePlatformException(HttpStatusCode.InternalServerError))
            );
        var instanceClient = CreateInstanceClient(state);

        using HttpClient client = CreateClient(dataClient, instanceClient);
        using HttpResponseMessage response = await client.GetAsync(GetUrl(state, includeRowId: true));

        response.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task GetWithoutRowIds_WhenNonIdle_ReturnsReadHookChangesWithoutPersistingOrRefreshing(
        ProcessStatus status
    )
    {
        TestState state = CreateState(status);
        Guid existingRowId = Guid.NewGuid();
        Skjema storedModel = CreateModel(existingRowId);
        var dataClient = CreateDataClient(state, () => storedModel);
        var instanceClient = CreateInstanceClient(state);
        var dataProcessor = new Mock<IDataProcessor>(MockBehavior.Strict);
        dataProcessor
            .Setup(processor =>
                processor.ProcessDataRead(It.IsAny<Instance>(), state.DataElementId, It.IsAny<Skjema>(), language: null)
            )
            .Callback<Instance, Guid?, object, string?>(
                (_, _, model, _) =>
                {
                    var typedModel = Assert.IsType<Skjema>(model);
                    Assert.Equal(existingRowId, GetOnlyRow(typedModel).AltinnRowId);
                    typedModel.Melding!.Name = "from-read-hook";
                }
            )
            .Returns(Task.CompletedTask);

        using HttpClient client = CreateClient(dataClient, instanceClient, dataProcessor);
        Skjema responseModel = await GetModel(client, state, includeRowId: false);

        Assert.Equal("from-read-hook", responseModel.Melding!.Name);
        Assert.Equal(Guid.Empty, GetOnlyRow(responseModel).AltinnRowId);
        Assert.Equal("stored", storedModel.Melding!.Name);
        Assert.Equal(existingRowId, GetOnlyRow(storedModel).AltinnRowId);
        dataClient.Verify(
            client =>
                client.UpdateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<object>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        instanceClient.Verify(
            client =>
                client.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        dataProcessor.VerifyAll();
    }

    private HttpClient CreateClient(
        Mock<IDataClient> dataClient,
        Mock<IInstanceClient> instanceClient,
        Mock<IDataProcessor>? dataProcessor = null,
        Mock<IFormDataReader>? formDataReader = null
    )
    {
        var metadataDataClient = dataClient.As<IDataClientWithStorageMetadata>();
        var mutationClient = dataClient.As<IInstanceMutationClient>();
        var metadataInstanceClient = instanceClient.As<IInstanceClientWithStorageMetadata>();
        var pdp = new Mock<IPDP>(MockBehavior.Strict);
        pdp.Setup(client => client.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse { Response = [new XacmlJsonResult { Decision = "Permit" }] });

        return GetRootedUserClient(
            Org,
            App,
            partyId: InstanceOwnerPartyId,
            configureServices: services =>
            {
                services.Replace(ServiceDescriptor.Singleton(dataClient.Object));
                services.Replace(ServiceDescriptor.Singleton(metadataDataClient.Object));
                services.Replace(ServiceDescriptor.Singleton(mutationClient.Object));
                services.Replace(ServiceDescriptor.Singleton(instanceClient.Object));
                services.Replace(ServiceDescriptor.Singleton(metadataInstanceClient.Object));
                services.RemoveAll<IPDP>();
                services.AddSingleton(pdp.Object);
                if (dataProcessor is not null)
                {
                    services.AddSingleton(dataProcessor.Object);
                }
                if (formDataReader is not null)
                {
                    services.Replace(ServiceDescriptor.Singleton(formDataReader.Object));
                }
            }
        );
    }

    private static Mock<IDataClient> CreateDataClient(TestState state, Func<Skjema> getStoredModel)
    {
        var dataClient = new Mock<IDataClient>(MockBehavior.Strict);
        _ = dataClient.As<IDataClientWithStorageMetadata>();
        _ = dataClient.As<IInstanceMutationClient>();
        dataClient
            .Setup(client =>
                client.GetFormData(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.Is<DataElement>(element => element.Id == state.DataElementId.ToString())
                )
            )
            .ReturnsAsync(() => Clone(getStoredModel()));
        return dataClient;
    }

    private static Mock<IInstanceClient> CreateInstanceClient(TestState state)
    {
        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        var metadataClient = instanceClient.As<IInstanceClientWithStorageMetadata>();
        metadataClient
            .Setup(client =>
                client.GetInstanceWithStorageMetadata(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    state.InstanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new InstanceWithStorageMetadata(Clone(state.Instance), StorageVersionMetadata.Empty));
        instanceClient
            .Setup(client =>
                client.UpdateReadStatus(
                    InstanceOwnerPartyId,
                    state.InstanceId,
                    "read",
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => Clone(state.Instance));
        return instanceClient;
    }

    private static void SetupInstanceRefresh(Mock<IInstanceClient> instanceClient, TestState state)
    {
        instanceClient
            .Setup(client =>
                client.GetInstance(
                    It.Is<Instance>(instance => instance.Id == state.Instance.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => Clone(state.Instance));
    }

    private async Task<Skjema> GetModel(HttpClient client, TestState state, bool includeRowId)
    {
        using HttpResponseMessage response = await client.GetAsync(GetUrl(state, includeRowId));
        return await VerifyStatusAndDeserialize<Skjema>(response, HttpStatusCode.OK);
    }

    private static string GetUrl(TestState state, bool includeRowId) =>
        $"/{Org}/{App}/instances/{InstanceOwnerPartyId}/{state.InstanceId}/data/{state.DataElementId}?includeRowId={includeRowId.ToString().ToLowerInvariant()}";

    private static TestState CreateState(ProcessStatus status)
    {
        Guid instanceId = Guid.NewGuid();
        Guid dataElementId = Guid.NewGuid();
        return new TestState(
            instanceId,
            dataElementId,
            new Instance
            {
                Id = $"{InstanceOwnerPartyId}/{instanceId}",
                AppId = $"{Org}/{App}",
                Org = Org,
                InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
                Process = new ProcessState { Status = status },
                Data =
                [
                    new DataElement
                    {
                        Id = dataElementId.ToString(),
                        InstanceGuid = instanceId.ToString(),
                        DataType = "default",
                        ContentType = "application/xml",
                    },
                ],
            }
        );
    }

    private static Skjema CreateModel(Guid rowId = default) =>
        new()
        {
            Melding = new Dummy
            {
                Name = "stored",
                SimpleList = new ValuesList
                {
                    SimpleKeyvalues = [new SimpleKeyvalues { Key = "stored-row", AltinnRowId = rowId }],
                },
            },
        };

    private static SimpleKeyvalues GetOnlyRow(Skjema model) =>
        Assert.Single(Assert.IsType<List<SimpleKeyvalues>>(model.Melding?.SimpleList?.SimpleKeyvalues));

    private static T Clone<T>(T value) =>
        JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value, JsonSerializerOptions), JsonSerializerOptions)
        ?? throw new JsonException($"Could not clone {typeof(T).Name}.");

    private static PlatformHttpException CreatePlatformException(HttpStatusCode statusCode) =>
        new(statusCode, $"Storage returned {(int)statusCode}.");

    private sealed record TestState(Guid InstanceId, Guid DataElementId, Instance Instance);
}
