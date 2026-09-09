using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Signing;

public sealed class SigneeInitializationRetryTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Abort_RetryRefreshesMetadataAfterCompletedOrPartialCleanup(bool failOneDelete)
    {
        await using var fixture = new Fixture();
        fixture.SeedLegacyState();
        fixture.AddSignature();
        string incomingState = fixture.Snapshot();
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Abort(first);
        fixture.FailNextDelete = failOneDelete;
        if (failOneDelete)
        {
            await Assert.ThrowsAsync<HttpRequestException>(() => Fixture.Commit(first));
            Assert.Single(fixture.Stored.Data);
        }
        else
        {
            await Fixture.Commit(first);
            Assert.Empty(fixture.Stored.Data);
        }

        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Abort(retry);
        await Fixture.Commit(retry);

        Assert.Empty(fixture.Stored.Data);
        Assert.Empty(retry.Instance.Data);
        Assert.Equal(failOneDelete ? 3 : 2, fixture.DeleteCalls);
        Assert.Equal(0, fixture.ProviderCalls);
        fixture.AccessManagement.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        fixture.Correspondence.Verify(
            x => x.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Resolve_ResponseLost_AdoptsSavedStateWithoutCallingProviderAgain()
    {
        await using var fixture = new Fixture();
        string incomingState = fixture.Snapshot();
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Resolve(first);
        await Fixture.Commit(first);
        string elementId = Assert.Single(fixture.Stored.Data).Id;

        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Resolve(retry);
        await Fixture.Commit(retry);

        Assert.Equal(elementId, Assert.Single(fixture.Stored.Data).Id);
        Assert.Equal(elementId, Assert.Single(retry.Instance.Data).Id);
        Assert.Equal(1, fixture.ProviderCalls);
        Assert.Equal(1, fixture.InsertCalls);
        Assert.Single(await fixture.ReadState());
    }

    [Fact]
    public async Task Resolve_CreateSucceedsDeleteFails_RetryAdoptsNewStateAndFinishesCleanup()
    {
        await using var fixture = new Fixture();
        string oldId = fixture.AddOldState();
        string incomingState = fixture.Snapshot();
        fixture.FailNextDelete = true;
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Resolve(first);
        await Assert.ThrowsAsync<HttpRequestException>(() => Fixture.Commit(first));
        Assert.Equal(2, fixture.Stored.Data.Count);
        string newId = fixture.Stored.Data.Single(x => x.Id != oldId).Id;

        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Resolve(retry);
        await Fixture.Commit(retry);

        Assert.Equal(newId, Assert.Single(fixture.Stored.Data).Id);
        Assert.Equal(newId, Assert.Single(retry.Instance.Data).Id);
        Assert.Equal(1, fixture.ProviderCalls);
        Assert.Equal(1, fixture.InsertCalls);
        Assert.Equal(2, fixture.DeleteCalls);
    }

    [Fact]
    public async Task Resolve_DeleteSucceedsCreateFails_RetryDoesNotDeleteMissingElement()
    {
        await using var fixture = new Fixture();
        fixture.AddOldState();
        string incomingState = fixture.Snapshot();
        fixture.FailNextInsert = true;
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Resolve(first);
        await Assert.ThrowsAsync<HttpRequestException>(() => Fixture.Commit(first));
        Assert.Empty(fixture.Stored.Data);

        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Resolve(retry);
        await Fixture.Commit(retry);

        Assert.Single(fixture.Stored.Data);
        Assert.Single(retry.Instance.Data);
        Assert.Equal(2, fixture.ProviderCalls);
        Assert.Equal(2, fixture.InsertCalls);
        Assert.Equal(1, fixture.DeleteCalls);
    }

    [Fact]
    public async Task Delegate_ResponseLost_RetryReadsSavedCheckpointAndSkipsGrant()
    {
        await using var fixture = new Fixture();
        await fixture.ResolveAndCommit();
        string incomingState = fixture.Snapshot();
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Delegate(first);
        await Fixture.Commit(first);
        Reference reference = Assert.Single(Assert.Single(fixture.Stored.Data).References);
        Assert.Equal(RelationType.GeneratedFrom, reference.Relation);
        Assert.Equal(ReferenceType.Task, reference.ValueType);
        Assert.Equal("SigningTask", reference.Value);

        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Delegate(retry);
        await Fixture.Commit(retry);

        Assert.True(Assert.Single(await fixture.ReadState()).SigneeState.IsAccessDelegated);
        fixture.AccessManagement.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        Assert.Equal(1, fixture.ProviderCalls);
    }

    [Fact]
    public async Task Notify_IndependentRecipientRetry_MergesFreshSiblingCheckpointAndKeepsKey()
    {
        await using var fixture = new Fixture(signeeCount: 2);
        await fixture.ResolveAndCommit();
        InstanceDataUnitOfWork delegation = fixture.Restore(fixture.Snapshot());
        await fixture.Delegate(delegation);
        await Fixture.Commit(delegation);
        InstanceDataUnitOfWork secondDelegation = fixture.Restore(fixture.Snapshot());
        await fixture.Delegate(secondDelegation, recipient: 1);
        await Fixture.Commit(secondDelegation);
        string incomingState = fixture.Snapshot();
        var sent = new HashSet<Guid>();
        var attempts = new List<Guid>();
        fixture
            .Correspondence.Setup(x => x.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Returns(
                (SendCorrespondencePayload payload, CancellationToken _) =>
                {
                    Guid key = Assert.IsType<Guid>(payload.CorrespondenceRequest.IdempotentKey);
                    attempts.Add(key);
                    if (attempts.Count == 2)
                        throw new HttpRequestException(
                            "Correspondence unavailable",
                            null,
                            HttpStatusCode.ServiceUnavailable
                        );
                    if (!sent.Add(key))
                        throw new CorrespondenceRequestException("Already sent", null, HttpStatusCode.Conflict, null);
                    return Task.FromResult(
                        new SendCorrespondenceResponse
                        {
                            Correspondences =
                            [
                                new CorrespondenceDetailsResponse
                                {
                                    CorrespondenceId = Guid.NewGuid(),
                                    Recipient = payload.CorrespondenceRequest.Recipients[0],
                                },
                            ],
                        }
                    );
                }
            );

        InstanceDataUnitOfWork firstNotification = fixture.Restore(incomingState);
        await fixture.Notify(firstNotification);
        await Fixture.Commit(firstNotification);
        await Assert.ThrowsAsync<HttpRequestException>(() =>
            fixture.Notify(fixture.Restore(incomingState), recipient: 1)
        );
        List<SigneeContext> afterFailure = await fixture.ReadState();
        Assert.True(afterFailure[0].SigneeState.HasBeenMessagedForCallToSign);
        Assert.False(afterFailure[1].SigneeState.HasBeenMessagedForCallToSign);
        Guid? firstCorrespondenceId = afterFailure[0].SigneeState.CtaCorrespondenceId;
        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Notify(retry, recipient: 1);
        await Fixture.Commit(retry);

        Assert.Equal(3, attempts.Count);
        Assert.Equal(attempts[1], attempts[2]);
        Assert.Equal(firstCorrespondenceId, (await fixture.ReadState())[0].SigneeState.CtaCorrespondenceId);
        Assert.NotEqual(attempts[0], attempts[1]);
        Assert.Equal(2, sent.Count);
        Assert.All(await fixture.ReadState(), context => Assert.True(context.SigneeState.HasBeenMessagedForCallToSign));
        Assert.Equal("SigningTask", Assert.Single(Assert.Single(fixture.Stored.Data).References).Value);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Notify_ResponseLost_ReusesTaskEntryKeyAndSavedSuccess(bool responseLostAfterSave)
    {
        await using var fixture = new Fixture();
        await fixture.ResolveAndCommit();
        InstanceDataUnitOfWork delegation = fixture.Restore(fixture.Snapshot());
        await fixture.Delegate(delegation);
        await Fixture.Commit(delegation);
        string incomingState = fixture.Snapshot();
        var accepted = new HashSet<Guid>();
        var attempts = new List<Guid>();
        fixture
            .Correspondence.Setup(x => x.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Returns(
                (SendCorrespondencePayload payload, CancellationToken _) =>
                {
                    Guid key = Assert.IsType<Guid>(payload.CorrespondenceRequest.IdempotentKey);
                    attempts.Add(key);
                    if (!accepted.Add(key))
                        throw new CorrespondenceRequestException("Already sent", null, HttpStatusCode.Conflict, null);
                    return Task.FromResult(
                        new SendCorrespondenceResponse
                        {
                            Correspondences =
                            [
                                new CorrespondenceDetailsResponse
                                {
                                    CorrespondenceId = Guid.NewGuid(),
                                    Recipient = payload.CorrespondenceRequest.Recipients[0],
                                },
                            ],
                        }
                    );
                }
            );
        InstanceDataUnitOfWork first = fixture.Restore(incomingState);
        await fixture.Notify(first);
        if (responseLostAfterSave)
            await Fixture.Commit(first);
        InstanceDataUnitOfWork retry = fixture.Restore(incomingState);
        await fixture.Notify(retry, newWorkflowIdentity: true);
        await Fixture.Commit(retry);

        Assert.Single(accepted);
        Assert.Single(attempts.Distinct());
        Assert.Equal(responseLostAfterSave ? 1 : 2, attempts.Count);
        Assert.True(Assert.Single(await fixture.ReadState()).SigneeState.HasBeenMessagedForCallToSign);
    }

    [Fact]
    public async Task ExistingInstance_LegacyStateIsReadableAndRevocableWithoutInitialization()
    {
        await using var fixture = new Fixture();
        fixture.SeedLegacyState();
        SigneeContext context = Assert.Single(await fixture.ReadState());
        Assert.True(context.SigneeState.IsAccessDelegated);
        Assert.True(context.SigneeState.HasBeenMessagedForCallToSign);
        Assert.Null(context.SigneeState.DelegationFailure);
        Assert.Null(context.SigneeState.NotificationFailure);

        await fixture.Revoke(fixture.Restore(fixture.Snapshot()));

        fixture.AccessManagement.Verify(
            x =>
                x.RevokeRights(
                    It.Is<DelegationRequest>(request =>
                        request.To != null && request.To.Value == "22222222-2222-2222-2222-222222222222"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        fixture.AccessManagement.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        fixture.Correspondence.Verify(
            x => x.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        Assert.Equal(0, fixture.ProviderCalls);
        Assert.Equal(0, fixture.InsertCalls);
        Assert.Single(fixture.Stored.Data);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private const string TaskId = "SigningTask";
        private const string DataTypeId = "signeeStates";
        private readonly Guid _workflowId = Guid.NewGuid();
        private readonly Guid _stepId = Guid.NewGuid();
        private readonly Dictionary<string, byte[]> _bytes = [];
        private readonly Mock<IDataClient> _data = new(MockBehavior.Strict);
        private readonly Mock<IInstanceClient> _instances = new(MockBehavior.Strict);
        private readonly ServiceProvider _services;
        private readonly ApplicationMetadata _metadata = new("ttd/app")
        {
            DataTypes = [new DataType { Id = DataTypeId }, new DataType { Id = "signatures" }],
        };
        private readonly SigneeContextsManager _manager;
        private readonly SigneeInitializationService _initialization;
        private readonly SigningService _signing;
        private readonly AbortRuntimeDelegatedSigningCommand _abort;
        private readonly AltinnSignatureConfiguration _config = new()
        {
            SigneeProviderId = "provider",
            SigneeStatesDataTypeId = DataTypeId,
            SignatureDataType = "signatures",
            CorrespondenceResources = [new AltinnEnvironmentConfig { Value = "app_ttd_correspondence" }],
        };

        public Instance Stored { get; } =
            new()
            {
                Id = "1337/11111111-1111-1111-1111-111111111111",
                AppId = "ttd/app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner { PartyId = "1337", OrganisationNumber = "991825827" },
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = TaskId } },
                Data = [],
            };
        public Mock<IAccessManagementClient> AccessManagement { get; } = new();
        public Mock<ICorrespondenceClient> Correspondence { get; } = new();
        public int ProviderCalls { get; private set; }
        public int InsertCalls { get; private set; }
        public int DeleteCalls { get; private set; }
        public bool FailNextInsert { get; set; }
        public bool FailNextDelete { get; set; }

        public Fixture(int signeeCount = 1)
        {
            _instances
                .Setup(x =>
                    x.GetInstance(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(() => JsonSerializer.Deserialize<Instance>(Snapshot())!);
            _data
                .Setup(x =>
                    x.GetDataBytes(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (int _, Guid _, Guid id, StorageAuthenticationMethod? _, CancellationToken _) =>
                        _bytes[id.ToString()].ToArray()
                );
            _data
                .Setup(x =>
                    x.InsertBinaryData(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<Stream>(),
                        It.IsAny<string?>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(
                    async (
                        string _,
                        string type,
                        string contentType,
                        string? filename,
                        Stream stream,
                        string? task,
                        StorageAuthenticationMethod? _,
                        CancellationToken _
                    ) =>
                    {
                        InsertCalls++;
                        if (FailNextInsert)
                        {
                            FailNextInsert = false;
                            throw new HttpRequestException(
                                "Storage create failed",
                                null,
                                HttpStatusCode.ServiceUnavailable
                            );
                        }
                        using var buffer = new MemoryStream();
                        await stream.CopyToAsync(buffer);
                        var element = new DataElement
                        {
                            Id = Guid.NewGuid().ToString(),
                            DataType = type,
                            ContentType = contentType,
                            Filename = filename,
                            References =
                            [
                                new Reference
                                {
                                    Relation = RelationType.GeneratedFrom,
                                    ValueType = ReferenceType.Task,
                                    Value = task,
                                },
                            ],
                        };
                        _bytes[element.Id] = buffer.ToArray();
                        Stored.Data.Add(element);
                        return element;
                    }
                );
            _data
                .Setup(x =>
                    x.UpdateBinaryData(
                        It.IsAny<InstanceIdentifier>(),
                        It.IsAny<string?>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Stream>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(
                    async (
                        InstanceIdentifier _,
                        string? _,
                        string? _,
                        Guid id,
                        Stream stream,
                        StorageAuthenticationMethod? _,
                        CancellationToken _
                    ) =>
                    {
                        using var buffer = new MemoryStream();
                        await stream.CopyToAsync(buffer);
                        _bytes[id.ToString()] = buffer.ToArray();
                        DataElement element = Stored.Data.Single(x => x.Id == id.ToString());
                        // Match Storage: a binary update without generatedFromTask clears the task reference.
                        element.References = null;
                        return element;
                    }
                );
            _data
                .Setup(x =>
                    x.UpdateBinaryData(
                        It.IsAny<InstanceIdentifier>(),
                        It.IsAny<string?>(),
                        It.IsAny<string?>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Stream>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(
                    async (
                        InstanceIdentifier _,
                        string? _,
                        string? _,
                        Guid id,
                        Stream stream,
                        StorageAuthenticationMethod? _,
                        string? generatedFromTask,
                        CancellationToken _
                    ) =>
                    {
                        using var buffer = new MemoryStream();
                        await stream.CopyToAsync(buffer);
                        _bytes[id.ToString()] = buffer.ToArray();
                        DataElement element = Stored.Data.Single(x => x.Id == id.ToString());
                        element.References = string.IsNullOrEmpty(generatedFromTask)
                            ? null
                            :
                            [
                                new Reference
                                {
                                    Relation = RelationType.GeneratedFrom,
                                    ValueType = ReferenceType.Task,
                                    Value = generatedFromTask,
                                },
                            ];
                        return element;
                    }
                );
            _data
                .Setup(x =>
                    x.DeleteData(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>(),
                        false,
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(
                    (int _, Guid _, Guid id, bool _, StorageAuthenticationMethod? _, CancellationToken _) =>
                    {
                        DeleteCalls++;
                        if (FailNextDelete)
                        {
                            FailNextDelete = false;
                            return Task.FromException<bool>(
                                new HttpRequestException(
                                    "Storage delete failed",
                                    null,
                                    HttpStatusCode.ServiceUnavailable
                                )
                            );
                        }
                        if (!_bytes.Remove(id.ToString()))
                            return Task.FromException<bool>(
                                new HttpRequestException("Already deleted", null, HttpStatusCode.NotFound)
                            );
                        Stored.Data.RemoveAll(x => x.Id == id.ToString());
                        return Task.FromResult(true);
                    }
                );
            var metadataClient = new Mock<IAppMetadata>();
            metadataClient.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(_metadata);
            var partyClient = new Mock<IAltinnPartyClient>();
            var parties = Enumerable
                .Range(1, signeeCount)
                .Select(index => new Party
                {
                    PartyId = 1000 + index,
                    PartyUuid = Guid.NewGuid(),
                    Name = $"Signee {index}",
                    OrgNumber = IdentificationNumberProvider.OrganizationNumbers.GetValidNumber(index).ToString(),
                    Organization = new Organization
                    {
                        OrgNumber = IdentificationNumberProvider.OrganizationNumbers.GetValidNumber(index).ToString(),
                        Name = $"Signee {index}",
                    },
                })
                .ToList();
            partyClient
                .Setup(x => x.LookupParty(It.IsAny<PartyLookup>(), It.IsAny<StorageAuthenticationMethod?>()))
                .ReturnsAsync(
                    (PartyLookup lookup, StorageAuthenticationMethod? _) =>
                        parties.FirstOrDefault(x => x.OrgNumber == lookup.OrgNo) ?? parties[0]
                );
            var provider = new Mock<ISigneeProvider>();
            provider.SetupGet(x => x.Id).Returns("provider");
            provider
                .Setup(x => x.GetSignees(It.IsAny<GetSigneesParameters>()))
                .ReturnsAsync(() =>
                {
                    ProviderCalls++;
                    return new SigneeProviderResult
                    {
                        Signees = parties
                            .Select(p =>
                                (ProvidedSignee)
                                    new ProvidedOrganization { OrganizationNumber = p.OrgNumber, Name = p.Name }
                            )
                            .ToList(),
                    };
                });
            var services = new ServiceCollection();
            services.AddSingleton<AppImplementationFactory>();
            services.AddSingleton(provider.Object);
            _services = services.BuildServiceProvider();
            _manager = new SigneeContextsManager(
                partyClient.Object,
                _instances.Object,
                _services.GetRequiredService<AppImplementationFactory>(),
                metadataClient.Object,
                NullLogger<SigneeContextsManager>.Instance
            );
            var environment = new Mock<IHostEnvironment>();
            environment.SetupGet(x => x.EnvironmentName).Returns("Development");
            var cdn = new Mock<IAltinnCdnClient>();
            cdn.Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new AltinnCdnOrgDetails
                    {
                        Orgnr = "991825827",
                        Name = new AltinnCdnOrgName
                        {
                            Nb = "Digdir",
                            Nn = "Digdir",
                            En = "Digdir",
                        },
                        Environments = [],
                    }
                );
            var resources = new Mock<IAppResources>();
            resources
                .Setup(x => x.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new TextResource { Resources = [] });
            var translation = new TranslationService(
                new AppIdentifier("ttd/app"),
                resources.Object,
                NullLogger<TranslationService>.Instance,
                metadataClient.Object
            );
            var callToAction = new SigningCallToActionService(
                Correspondence.Object,
                environment.Object,
                metadataClient.Object,
                Mock.Of<IProfileClient>(),
                translation,
                NullLogger<SigningCallToActionService>.Instance,
                Microsoft.Extensions.Options.Options.Create(new GeneralSettings())
            );
            _signing = new SigningService(
                environment.Object,
                partyClient.Object,
                new SigningDelegationService(AccessManagement.Object, NullLogger<SigningDelegationService>.Instance),
                Mock.Of<IAuthorizationClient>(),
                NullLogger<SigningService>.Instance,
                _manager,
                new SignDocumentManager(partyClient.Object, metadataClient.Object, NullLogger<SigningService>.Instance)
            );
            var processReader = new Mock<IProcessReader>();
            processReader
                .Setup(x => x.GetAltinnTaskExtension(TaskId))
                .Returns(new AltinnTaskExtension { SignatureConfiguration = _config });
            _abort = new AbortRuntimeDelegatedSigningCommand(processReader.Object, _signing, _instances.Object);
            _initialization = new SigneeInitializationService(
                _manager,
                new SigningDelegationService(AccessManagement.Object, NullLogger<SigningDelegationService>.Instance),
                callToAction,
                partyClient.Object,
                cdn.Object,
                environment.Object,
                _instances.Object,
                NullLogger<SigneeInitializationService>.Instance
            );
        }

        public string Snapshot() => JsonSerializer.Serialize(Stored);

        public InstanceDataUnitOfWork Restore(string incomingState) =>
            new(
                JsonSerializer.Deserialize<Instance>(incomingState)!,
                _data.Object,
                _instances.Object,
                _metadata,
                null!,
                null!,
                null!,
                null!,
                TaskId,
                "nb"
            );

        public Task<SigneeInitializationOutcome> Resolve(InstanceDataUnitOfWork data) =>
            _initialization.ResolveSignees(data, _config, TaskId, CancellationToken.None);

        public async Task Delegate(InstanceDataUnitOfWork data, int recipient = 0)
        {
            Guid stateId = Guid.Parse(data.Instance.Data.Single(x => x.DataType == DataTypeId).Id);
            Guid signeeId = (await ReadState())[recipient].SigneeId!.Value;
            await _initialization.ExecuteDelegation(
                data,
                _config,
                TaskId,
                stateId,
                signeeId,
                _workflowId,
                CancellationToken.None
            );
        }

        public async Task Notify(InstanceDataUnitOfWork data, int recipient = 0, bool newWorkflowIdentity = false)
        {
            Guid stateId = Guid.Parse(data.Instance.Data.Single(x => x.DataType == DataTypeId).Id);
            Guid signeeId = (await ReadState())[recipient].SigneeId!.Value;
            await _initialization.ExecuteNotification(
                data,
                _config,
                TaskId,
                stateId,
                signeeId,
                newWorkflowIdentity ? Guid.NewGuid() : _workflowId,
                newWorkflowIdentity ? Guid.NewGuid() : _stepId,
                CancellationToken.None
            );
        }

        public Task Revoke(InstanceDataUnitOfWork data) =>
            _signing.RevokeSigneeRightsOnTaskEnd(data, _config, CancellationToken.None);

        public Task<ProcessEngineCommandResult> Abort(InstanceDataUnitOfWork data) =>
            ((IWorkflowEngineCommand)_abort).Execute(
                new ProcessEngineCommandContext
                {
                    InstanceDataMutator = data,
                    WorkflowId = _workflowId,
                    StepId = _stepId,
                    CommandPayload = CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId)),
                }
            );

        public void AddSignature()
        {
            var element = new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = "signatures",
                ContentType = "application/json",
            };
            Stored.Data.Add(element);
            _bytes[element.Id] = "{}"u8.ToArray();
        }

        public Task<List<SigneeContext>> ReadState() =>
            _manager.GetSigneeContexts(Restore(Snapshot()), _config, CancellationToken.None);

        public async Task ResolveAndCommit()
        {
            InstanceDataUnitOfWork data = Restore(Snapshot());
            await Resolve(data);
            await Commit(data);
        }

        public static async Task Commit(InstanceDataUnitOfWork data)
        {
            var changes = data.GetDataElementChanges(false);
            await data.UpdateInstanceData(changes);
            await data.SaveChanges(changes);
        }

        public string AddOldState()
        {
            var element = new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = DataTypeId,
                ContentType = "application/json",
            };
            Stored.Data.Add(element);
            _bytes[element.Id] = "[]"u8.ToArray();
            return element.Id;
        }

        public void SeedLegacyState()
        {
            string id = AddOldState();
            _bytes[id] =
                """
                {
                  "$id": "1",
                  "$values": [{
                    "$id": "2",
                    "taskId": "SigningTask",
                    "Signee": {
                      "$id": "3", "$type": "organization",
                      "OrgParty": { "PartyId": 1001, "PartyUuid": "22222222-2222-2222-2222-222222222222", "OrgNumber": "991825827", "Name": "Digdir" },
                      "OrgNumber": "991825827", "OrgName": "Digdir"
                    },
                    "CommunicationConfig": null,
                    "additionalActionsToDelegate": null,
                    "signeeState": {
                      "isAccessDelegated": true,
                      "delegationFailedReason": null,
                      "hasBeenMessagedForCallToSign": true,
                      "ctaCorrespondenceId": "33333333-3333-3333-3333-333333333333",
                      "callToSignFailedReason": null
                    }
                  }]
                }
                """u8.ToArray();
        }

        public ValueTask DisposeAsync() => _services.DisposeAsync();
    }
}
