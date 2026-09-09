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
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
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
    [Fact]
    public async Task Resolve_ResponseLost_AggregateReplayPreservesFrozenIdsAndVirtualTask()
    {
        await using var fixture = new Fixture();
        string incomingState = await fixture.Capture();
        Guid stepId = Guid.NewGuid();
        InstanceDataUnitOfWork first = await fixture.Restore(incomingState);
        await fixture.Resolve(first);
        await Fixture.Commit(first, stepId);
        string elementId = Assert.Single(fixture.Stored.Data).Id;
        Guid? signeeId = Assert.Single(await fixture.ReadState()).SigneeId;

        InstanceDataUnitOfWork retry = await fixture.Restore(incomingState);
        await fixture.Resolve(retry);
        await Fixture.Commit(retry, stepId);

        Assert.Equal(elementId, Assert.Single(retry.Instance.Data).Id);
        Assert.Equal(signeeId, Assert.Single(await fixture.ReadState()).SigneeId);
        Assert.Equal("SigningTask", retry.Instance.Process.CurrentTask.ElementId);
        Assert.Equal("SourceTask", fixture.Stored.Process.CurrentTask.ElementId);
        Assert.Equal(1, fixture.InsertCalls);
        Assert.Equal(1, fixture.ReplayCount);
        Assert.Equal(2, fixture.ProviderCalls);
    }

    [Fact]
    public async Task Resolve_AggregateFailure_PreservesOldStateUntilAtomicRetry()
    {
        await using var fixture = new Fixture();
        string oldId = fixture.AddOldState();
        string incomingState = await fixture.Capture();
        InstanceDataUnitOfWork first = await fixture.Restore(incomingState);
        await fixture.Resolve(first);
        fixture.FailNextCommit = true;
        await Assert.ThrowsAsync<PlatformHttpException>(() => Fixture.Commit(first));
        Assert.Equal(oldId, Assert.Single(fixture.Stored.Data).Id);
        Assert.Equal(0, fixture.InsertCalls);
        Assert.Equal(0, fixture.DeleteCalls);

        InstanceDataUnitOfWork retry = await fixture.Restore(incomingState);
        await fixture.Resolve(retry);
        await Fixture.Commit(retry);
        Assert.NotEqual(oldId, Assert.Single(fixture.Stored.Data).Id);
        Assert.Equal(1, fixture.InsertCalls);
        Assert.Equal(1, fixture.DeleteCalls);
    }

    [Fact]
    public async Task Delegate_ResponseLost_CarriedBytesReachAggregateReplay()
    {
        await using var fixture = new Fixture();
        await fixture.ResolveAndCommit();
        string incomingState = await fixture.Capture();
        Guid stepId = Guid.NewGuid();
        InstanceDataUnitOfWork first = await fixture.Restore(incomingState);
        await fixture.Delegate(first);
        await Fixture.Commit(first, stepId);
        InstanceDataUnitOfWork retry = await fixture.Restore(incomingState);
        await fixture.Delegate(retry);
        await Fixture.Commit(retry, stepId);

        Assert.True(Assert.Single(await fixture.ReadState()).SigneeState.IsAccessDelegated);
        Assert.Equal(1, fixture.ReplayCount);
        Assert.Equal("SigningTask", Assert.Single(Assert.Single(retry.Instance.Data).References).Value);
        Assert.Equal("SigningTask", retry.Instance.Process.CurrentTask.ElementId);
        fixture.AccessManagement.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Delegate_StaleBlobWithoutCarriedBytes_IsRejectedBeforeGrant()
    {
        await using var fixture = new Fixture();
        await fixture.ResolveAndCommit();
        InstanceDataUnitOfWork stale = fixture.Fresh();
        InstanceDataUnitOfWork first = fixture.Fresh();
        await fixture.Delegate(first);
        await Fixture.Commit(first);

        await Assert.ThrowsAsync<DataElementContentConflictException>(() => fixture.Delegate(stale));
        fixture.AccessManagement.Verify(
            x => x.DelegateRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Notify_SequentialRetry_PreservesEarlierRecipientAndStableKey()
    {
        await using var fixture = new Fixture(signeeCount: 2);
        await fixture.ResolveAndCommit();
        foreach (int recipient in new[] { 0, 1 })
        {
            InstanceDataUnitOfWork grant = fixture.Fresh();
            await fixture.Delegate(grant, recipient);
            await Fixture.Commit(grant);
        }
        var accepted = new HashSet<Guid>();
        var attempts = new List<Guid>();
        fixture.SetupNotification(accepted, attempts, failAttempt: 2);
        InstanceDataUnitOfWork first = await fixture.Restore(await fixture.Capture());
        await fixture.Notify(first);
        await Fixture.Commit(first);
        string incomingSecondState = await fixture.Capture(first);
        Guid? firstCorrespondence = (await fixture.ReadState())[0].SigneeState.CtaCorrespondenceId;
        await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await fixture.Notify(await fixture.Restore(incomingSecondState), recipient: 1)
        );

        InstanceDataUnitOfWork retry = await fixture.Restore(incomingSecondState);
        await fixture.Notify(retry, recipient: 1);
        await Fixture.Commit(retry);
        Assert.Equal(3, attempts.Count);
        Assert.Equal(attempts[1], attempts[2]);
        Assert.NotEqual(attempts[0], attempts[1]);
        Assert.Equal(2, accepted.Count);
        Assert.Equal(firstCorrespondence, (await fixture.ReadState())[0].SigneeState.CtaCorrespondenceId);
        Assert.All(await fixture.ReadState(), context => Assert.True(context.SigneeState.HasBeenMessagedForCallToSign));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Notify_ResponseLost_ReusesTaskEntryKeyAndAggregateReplay(bool saved)
    {
        await using var fixture = new Fixture();
        await fixture.ResolveAndCommit();
        InstanceDataUnitOfWork grant = fixture.Fresh();
        await fixture.Delegate(grant);
        await Fixture.Commit(grant);
        string incomingState = await fixture.Capture();
        var accepted = new HashSet<Guid>();
        var attempts = new List<Guid>();
        fixture.SetupNotification(accepted, attempts);
        Guid stepId = Guid.NewGuid();
        InstanceDataUnitOfWork first = await fixture.Restore(incomingState);
        await fixture.Notify(first);
        if (saved)
            await Fixture.Commit(first, stepId);
        InstanceDataUnitOfWork retry = await fixture.Restore(incomingState);
        await fixture.Notify(retry, newWorkflowIdentity: true);
        await Fixture.Commit(retry, stepId);

        Assert.Single(accepted);
        Assert.Single(attempts.Distinct());
        Assert.Equal(2, attempts.Count);
        Assert.Equal(saved ? 1 : 0, fixture.ReplayCount);
        Assert.True(Assert.Single(await fixture.ReadState()).SigneeState.HasBeenMessagedForCallToSign);
        if (saved)
            Assert.NotNull(Assert.Single(await fixture.ReadState()).SigneeState.CtaCorrespondenceId);
        string replayedState = await fixture.Capture(retry);
        InstanceDataUnitOfWork continued = await fixture.Restore(replayedState);
        await fixture.Notify(continued);
        Assert.Equal(2, attempts.Count);
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

        await fixture.Revoke(fixture.Fresh());

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
        private readonly Mock<IDataClientWithStorageMetadata> _data = new(MockBehavior.Strict);
        private readonly Mock<IInstanceClientWithStorageMetadata> _instances = new(MockBehavior.Strict);
        private readonly ServiceProvider _services;
        private readonly Mock<IInstanceMutationClient> _mutations = new(MockBehavior.Strict);
        private readonly Dictionary<string, (int Previous, int Produced, IReadOnlyList<Guid> Created)> _receipts = [];
        private readonly WorkflowCallbackStateService _stateService;
        private int _instanceVersion = 1;
        private StorageVersionMetadata Versions => new(_instanceVersion, 1);
        private readonly ApplicationMetadata _metadata = new("ttd/app")
        {
            DataTypes = [new DataType { Id = DataTypeId }, new DataType { Id = "signatures" }],
        };
        private readonly SigneeContextsManager _manager;
        private readonly SigneeInitializationService _initialization;
        private readonly SigningService _signing;
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
                Process = new ProcessState
                {
                    Status = ProcessStatus.Processing,
                    CurrentTask = new ProcessElementInfo { ElementId = "SourceTask" },
                },
                Data = [],
            };
        public Mock<IAccessManagementClient> AccessManagement { get; } = new();
        public Mock<ICorrespondenceClient> Correspondence { get; } = new();
        public int ProviderCalls { get; private set; }
        public int InsertCalls { get; private set; }
        public int DeleteCalls { get; private set; }
        public bool FailNextCommit { get; set; }
        public int ReplayCount { get; private set; }

        public Fixture(int signeeCount = 1)
        {
            _instances
                .Setup(x =>
                    x.GetInstanceWithStorageMetadata(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(() => new InstanceWithStorageMetadata(CloneStored(), Versions));
            _data
                .Setup(x =>
                    x.GetDataBytesWithExpectedBlobVersionId(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (int _, Guid _, Guid id, StorageAuthenticationMethod? _, string? expected, CancellationToken _) =>
                    {
                        DataElement element =
                            Stored.Data.SingleOrDefault(element => element.Id == id.ToString())
                            ?? throw new PlatformHttpException(HttpStatusCode.NotFound, "Data element was deleted.");
                        if (expected is not null && expected != element.BlobVersionId)
                            throw new PlatformHttpException(HttpStatusCode.PreconditionFailed, "Blob version changed.");
                        return _bytes[element.Id];
                    }
                );
            _mutations
                .Setup(x =>
                    x.CommitInstanceMutationWithStorageMetadata(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageInstanceMutationRequest>(),
                        It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<StorageWritePreconditions?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (
                        int _,
                        Guid _,
                        StorageInstanceMutationRequest request,
                        IReadOnlyDictionary<string, StorageInstanceMutationContent> content,
                        StorageAuthenticationMethod? _,
                        StorageWritePreconditions? preconditions,
                        CancellationToken _
                    ) => ApplyMutation(request, content, preconditions!)
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
            processReader
                .Setup(x => x.GetProcessTasks())
                .Returns([
                    new ProcessTask
                    {
                        Id = TaskId,
                        ExtensionElements = new ExtensionElements
                        {
                            TaskExtension = new AltinnTaskExtension { SignatureConfiguration = _config },
                        },
                    },
                ]);
            var serialization = new ModelSerializationService(Mock.Of<IAppModel>());
            var initializer = new InstanceDataUnitOfWorkInitializer(
                _data.Object,
                _mutations.Object,
                _instances.Object,
                metadataClient.Object,
                translation,
                serialization,
                resources.Object,
                Microsoft.Extensions.Options.Options.Create(new FrontEndSettings())
            );
            var code = new AppCode
            {
                Id = "signing-test",
                Code = "secret-code-long-enough-for-signing-tests",
                IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            };
            var secrets = new Mock<IWorkflowCallbackSecretProvider>();
            secrets.Setup(x => x.GetSigningSecret()).Returns(code);
            secrets.Setup(x => x.GetValidationSecrets()).Returns([code]);
            _stateService = new WorkflowCallbackStateService(
                initializer,
                serialization,
                metadataClient.Object,
                Mock.Of<IAppModel>(),
                new WorkflowStateSigner(secrets.Object),
                processReader.Object
            );
            _initialization = new SigneeInitializationService(
                _manager,
                new SigningDelegationService(AccessManagement.Object, NullLogger<SigningDelegationService>.Instance),
                callToAction,
                partyClient.Object,
                cdn.Object,
                environment.Object,
                NullLogger<SigneeInitializationService>.Instance
            );
        }

        private Instance CloneStored() => JsonSerializer.Deserialize<Instance>(JsonSerializer.Serialize(Stored))!;

        public Task<string> Capture(InstanceDataUnitOfWork? data = null) => _stateService.CaptureState(data ?? Fresh());

        public async Task<InstanceDataUnitOfWork> Restore(string state) =>
            (await _stateService.RestoreState(new InstanceIdentifier(Stored), state, "nb")).UnitOfWork;

        public InstanceDataUnitOfWork Fresh()
        {
            Instance carried = CloneStored();
            carried.Process.CurrentTask.ElementId = TaskId;
            return new InstanceDataUnitOfWork(
                carried,
                Versions,
                _data.Object,
                _mutations.Object,
                _instances.Object,
                _metadata,
                null!,
                null!,
                null!,
                null!,
                TaskId,
                "nb"
            );
        }

        private InstanceMutationWithStorageMetadata ApplyMutation(
            StorageInstanceMutationRequest request,
            IReadOnlyDictionary<string, StorageInstanceMutationContent> content,
            StorageWritePreconditions preconditions
        )
        {
            string key = Assert.IsType<string>(preconditions.IdempotencyKey);
            int expected = Assert.IsType<int>(preconditions.InstanceVersion);
            if (_receipts.TryGetValue(key, out var prior))
            {
                Assert.Equal(prior.Previous, expected);
                Assert.Equal(prior.Produced, _instanceVersion);
                ReplayCount++;
                return new InstanceMutationWithStorageMetadata(CloneStored(), Versions, prior.Created, replayed: true);
            }
            Assert.Equal(_instanceVersion, expected);
            Assert.Equal(ProcessStatus.Processing, request.ExpectedProcessStatus);
            Assert.Null(request.ProcessState);
            if (FailNextCommit)
            {
                FailNextCommit = false;
                throw new PlatformHttpException(HttpStatusCode.ServiceUnavailable, "Aggregate commit failed.");
            }
            List<Guid> createdIds = [];
            foreach (var create in request.CreateDataElements)
            {
                var element = new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    InstanceGuid = new InstanceIdentifier(Stored).InstanceGuid.ToString(),
                    DataType = create.DataType,
                    ContentType = create.ContentType,
                    Filename = create.Filename,
                    BlobVersionId = Guid.NewGuid().ToString(),
                };
                if (create.GeneratedFromTask is { } task)
                    element.References =
                    [
                        new Reference
                        {
                            Relation = RelationType.GeneratedFrom,
                            ValueType = ReferenceType.Task,
                            Value = task,
                        },
                    ];
                Stored.Data.Add(element);
                _bytes[element.Id] = content[create.ContentPartName].Bytes.ToArray();
                createdIds.Add(Guid.Parse(element.Id));
                InsertCalls++;
            }
            foreach (var update in request.UpdateDataElements)
            {
                DataElement element = Stored.Data.Single(element => element.Id == update.DataElementId.ToString());
                Assert.Equal(element.BlobVersionId, update.ExpectedCurrentBlobVersion);
                _bytes[element.Id] = content[update.ContentPartName!].Bytes.ToArray();
                element.BlobVersionId = Guid.NewGuid().ToString();
                element.Refs = update.Refs;
                element.References = update.GeneratedFromTask is { } task
                    ?
                    [
                        new Reference
                        {
                            Relation = RelationType.GeneratedFrom,
                            ValueType = ReferenceType.Task,
                            Value = task,
                        },
                    ]
                    : null;
            }
            foreach (var delete in request.DeleteDataElements)
            {
                Assert.True(_bytes.Remove(delete.DataElementId.ToString()));
                Assert.Equal(1, Stored.Data.RemoveAll(element => element.Id == delete.DataElementId.ToString()));
                DeleteCalls++;
            }
            _instanceVersion++;
            _receipts.Add(key, (expected, _instanceVersion, createdIds));
            return new InstanceMutationWithStorageMetadata(CloneStored(), Versions, createdIds);
        }

        public void SetupNotification(HashSet<Guid> accepted, List<Guid> attempts, int? failAttempt = null)
        {
            Correspondence
                .Setup(x => x.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
                .Returns(
                    (SendCorrespondencePayload payload, CancellationToken _) =>
                    {
                        Guid key = Assert.IsType<Guid>(payload.CorrespondenceRequest.IdempotentKey);
                        attempts.Add(key);
                        if (attempts.Count == failAttempt)
                            throw new HttpRequestException(
                                "Correspondence unavailable",
                                null,
                                HttpStatusCode.ServiceUnavailable
                            );
                        if (!accepted.Add(key))
                            throw new CorrespondenceRequestException(
                                "Already sent",
                                null,
                                HttpStatusCode.Conflict,
                                null
                            );
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
        }

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

        public Task<List<SigneeContext>> ReadState() =>
            _manager.GetSigneeContexts(Fresh(), _config, CancellationToken.None);

        public async Task ResolveAndCommit()
        {
            InstanceDataUnitOfWork data = Fresh();
            await Resolve(data);
            await Commit(data);
        }

        public static async Task Commit(InstanceDataUnitOfWork data, Guid? stepId = null)
        {
            try
            {
                await data.SaveWorkflowOwnedAggregate(
                    data.GetDataElementChanges(false),
                    (stepId ?? Guid.NewGuid()).ToString(),
                    CancellationToken.None
                );
            }
            catch (InstanceMutationReplayedException)
            {
                // The callback controller treats this as success and captures the rebuilt authoritative state.
            }
        }

        public string AddOldState()
        {
            var element = new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = DataTypeId,
                BlobVersionId = Guid.NewGuid().ToString(),
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
