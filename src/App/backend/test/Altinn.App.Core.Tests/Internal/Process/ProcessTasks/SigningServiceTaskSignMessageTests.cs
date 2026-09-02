using System.Security.Cryptography;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class SigningServiceTaskSignMessageTests
{
    private const string TaskId = "Task_Sign";
    private const string SignatureDataType = "signature";
    private const string ModelDataType = "model";
    private const string IdempotencyKey = "4f9d2c1e5b7a4e0c9d3f6a8b1c2d3e4f";

    private static readonly Guid _instanceGuid = Guid.Parse("fa0678ad-960d-4307-aba2-ba29c9804c9d");
    private static readonly DateTimeOffset _acceptedAt = DateTimeOffset.Parse("2026-09-02T10:15:30+02:00");
    private static readonly byte[] _modelBytes = "<model>signed content</model>"u8.ToArray();

    private readonly Mock<IProcessReader> _processReader = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<ISigneeContextsManager> _signeeContextsManager = new(MockBehavior.Strict);
    private readonly Mock<ISignDocumentManager> _signDocumentManager = new(MockBehavior.Strict);
    private readonly Mock<ISigningReceiptService> _signingReceiptService = new(MockBehavior.Strict);
    private readonly Mock<IInstanceDataMutator> _dataMutator = new();
    private readonly List<byte[]> _addedSignatures = [];
    private readonly List<List<SignDocument>> _synchronizedDocuments = [];

    private readonly AltinnSignatureConfiguration _signatureConfiguration = new()
    {
        DataTypesToSign = [ModelDataType],
        SignatureDataType = SignatureDataType,
        SigningStateDataType = "signing-state",
    };

    private readonly DataType _signatureDataTypeDefinition = new()
    {
        Id = SignatureDataType,
        MinCount = 1,
        ActionRequiredToRead = "read",
        AllowedContributors = ["app:owned"],
    };

    private readonly DataElement _modelElement = new()
    {
        Id = "11111111-1111-1111-1111-111111111111",
        DataType = ModelDataType,
        ContentType = "application/xml",
    };

    private readonly Instance _instance;
    private readonly SigningServiceTask _task;

    public SigningServiceTaskSignMessageTests()
    {
        _instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            AppId = "ttd/app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = TaskId, AltinnTaskType = "signing" },
            },
            Data = [_modelElement],
        };

        _processReader
            .Setup(x => x.GetAltinnTaskExtension(TaskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = _signatureConfiguration });
        _appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        new DataType { Id = ModelDataType, MinCount = 1 },
                        _signatureDataTypeDefinition,
                        new DataType { Id = "signing-state", AllowedContributors = ["app:owned"] },
                    ],
                }
            );

        _dataMutator.Setup(x => x.Instance).Returns(_instance);
        _dataMutator.Setup(x => x.TaskId).Returns(TaskId);
        _dataMutator
            .Setup(x => x.GetBinaryData(It.Is<DataElementIdentifier>(id => id.Id == _modelElement.Id)))
            .ReturnsAsync(_modelBytes);
        _dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    SignatureDataType,
                    "application/json",
                    "signature.json",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    TaskId,
                    null
                )
            )
            .Callback(
                (string _, string _, string? _, ReadOnlyMemory<byte> bytes, string? _, List<KeyValueEntry>? _) =>
                    _addedSignatures.Add(bytes.ToArray())
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Created,
                    _signatureDataTypeDefinition,
                    "application/json",
                    null,
                    "signature.json",
                    ReadOnlyMemory<byte>.Empty,
                    TaskId
                )
            );

        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(_dataMutator.Object, _signatureConfiguration, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync([]);
        _signDocumentManager
            .Setup(x =>
                x.SynchronizeSigneeContextsWithSignDocuments(
                    TaskId,
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<List<SignDocument>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (string taskId, List<SigneeContext> contexts, List<SignDocument> documents, CancellationToken _) =>
                {
                    _synchronizedDocuments.Add(documents);
                    return [.. contexts, .. documents.Select(document => SignedContext(taskId, document))];
                }
            );

        _task = new SigningServiceTask(
            Mock.Of<ISigningService>(MockBehavior.Strict),
            _processReader.Object,
            _appMetadata.Object,
            Mock.Of<IHostEnvironment>(),
            Mock.Of<IPdfService>(MockBehavior.Strict),
            _signeeContextsManager.Object,
            _signDocumentManager.Object,
            _signingReceiptService.Object,
            NullLogger<SigningServiceTask>.Instance
        );
    }

    [Fact]
    public async Task HandleSignMessage_OneSignee_StoresTheDocumentAndConcludes()
    {
        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        byte[] bytes = Assert.Single(_addedSignatures);
        SignDocument document = SignDocumentManager.Deserialize(bytes);
        Assert.Equal(_instanceGuid.ToString(), document.InstanceGuid);
        Assert.Equal("1337", document.SigneeInfo.UserId);
        Assert.Equal("12345678901", document.SigneeInfo.PersonNumber);
        Assert.Null(document.SigneeInfo.SystemUserId);
        Assert.Null(document.SigneeInfo.OrganisationNumber);
        SignDocument.DataElementSignature signature = Assert.Single(document.DataElementSignatures);
        Assert.Equal(_modelElement.Id, signature.DataElementId);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(_modelBytes)), signature.Sha256Hash);
        Assert.True(signature.Signed);
        _dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        _dataMutator.Verify(
            x =>
                x.OverrideAuthenticationMethod(
                    It.Is<DataType>(d => d.Id == SignatureDataType),
                    It.IsAny<StorageAuthenticationMethod>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleSignMessage_RetriedAttempt_ProducesAByteIdenticalDocument()
    {
        Guid stepId = Guid.Parse("9ec7e888-8f05-423c-a54c-572f36b121ef");
        ServiceTaskContext context = Context(stepId);
        ServiceTaskReply reply = Reply(Message());

        await Handle(reply, context);
        await Handle(reply, context);

        Assert.Equal(2, _addedSignatures.Count);
        Assert.Equal(_addedSignatures[0], _addedSignatures[1]);
        SignDocument document = SignDocumentManager.Deserialize(_addedSignatures[0]);
        Assert.Equal(stepId.ToString(), document.Id);
        Assert.Equal(_acceptedAt.UtcDateTime, document.SignedTime);
        Assert.Equal(DateTimeKind.Utc, document.SignedTime.Kind);
    }

    [Fact]
    public async Task HandleSignMessage_SystemUserOnBehalfOfOrganization_MapsEveryIdentityField()
    {
        Guid systemUserId = Guid.Parse("7a1f3c9e-2b4d-4e6f-8a9b-0c1d2e3f4a5b");
        SignMessage message = Message() with
        {
            Signee = new SignMessage.SigneeInfo { SystemUserId = systemUserId, OrganizationNumber = "910000000" },
        };

        await Handle(Reply(message));

        SignDocument document = SignDocumentManager.Deserialize(Assert.Single(_addedSignatures));
        Assert.Null(document.SigneeInfo.UserId);
        Assert.Null(document.SigneeInfo.PersonNumber);
        Assert.Equal(systemUserId, document.SigneeInfo.SystemUserId);
        Assert.Equal("910000000", document.SigneeInfo.OrganisationNumber);
    }

    [Fact]
    public async Task HandleSignMessage_ProducesADocumentThatSignDocumentManagerReadsBack()
    {
        await Handle(Reply(Message()));
        byte[] bytes = Assert.Single(_addedSignatures);
        DataElement signatureElement = new()
        {
            Id = "22222222-2222-2222-2222-222222222222",
            DataType = SignatureDataType,
        };
        var accessor = new Mock<IInstanceDataAccessor>();
        accessor.Setup(x => x.Instance).Returns(new Instance { Data = [signatureElement] });
        accessor
            .Setup(x => x.GetBinaryData(It.Is<DataElementIdentifier>(id => id.Id == signatureElement.Id)))
            .ReturnsAsync(bytes);
        var manager = new SignDocumentManager(
            Mock.Of<IAltinnPartyClient>(MockBehavior.Strict),
            _appMetadata.Object,
            NullLogger<SigningService>.Instance
        );

        List<SignDocument> documents = await manager.GetSignDocuments(
            accessor.Object,
            _signatureConfiguration,
            CancellationToken.None
        );

        SignDocument document = Assert.Single(documents);
        Assert.Equal(_acceptedAt.UtcDateTime, document.SignedTime);
        Assert.Equal("12345678901", document.SigneeInfo.PersonNumber);
        Assert.Equal(_modelElement.Id, Assert.Single(document.DataElementSignatures).DataElementId);
    }

    [Fact]
    public async Task HandleSignMessage_UntilTheMinimumCountIsReached_AwaitsTheNextReply()
    {
        _signatureDataTypeDefinition.MinCount = 2;

        ServiceTaskExchangeResult first = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskAwaitNextReplyResult>(first);
        Assert.Single(Assert.Single(_synchronizedDocuments));

        // The next message starts from the saved state, where the first document is an element on the instance.
        AddExistingSignature(SignDocumentManager.Deserialize(Assert.Single(_addedSignatures)));
        SignMessage second = Message() with
        {
            Signee = new SignMessage.SigneeInfo { UserId = "1338", PersonNumber = "22222222222" },
        };

        ServiceTaskExchangeResult result = await Handle(Reply(second, "second-message"));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.Equal(2, _synchronizedDocuments[^1].Count);
        Assert.Equal(2, _addedSignatures.Count);
        _dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task HandleSignMessage_UnsignedSigneeContext_AwaitsTheNextReply()
    {
        SigneeContext unsigned = new()
        {
            TaskId = TaskId,
            Signee = new PersonSignee
            {
                Party = new Party(),
                SocialSecurityNumber = "22222222222",
                FullName = "Other Signee",
            },
            SigneeState = new SigneeContextState(),
        };
        _signeeContextsManager
            .Setup(x =>
                x.GetSigneeContexts(_dataMutator.Object, _signatureConfiguration, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync([unsigned]);

        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        // The minimum count is met by the one document, but every signee context must have signed.
        Assert.IsType<ServiceTaskAwaitNextReplyResult>(result);
        Assert.Single(_addedSignatures);
    }

    [Fact]
    public async Task HandleSignMessage_SameSigneeAgain_ReplacesTheEarlierDocument()
    {
        DataElement sameSignee = AddExistingSignature(
            ExistingDocument(new StorageSignee { UserId = "1337", PersonNumber = "12345678901" })
        );
        // Same person, but on behalf of an organization: a different signee on Storage's four-field rule.
        AddExistingSignature(
            ExistingDocument(
                new StorageSignee
                {
                    UserId = "1337",
                    PersonNumber = "12345678901",
                    OrganisationNumber = "910000000",
                }
            )
        );

        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        _dataMutator.Verify(
            x => x.RemoveDataElement(It.Is<DataElementIdentifier>(id => id.Id == sameSignee.Id)),
            Times.Once
        );
        _dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Once);
        Assert.Single(_addedSignatures);
        List<SignDocument> evaluated = Assert.Single(_synchronizedDocuments);
        Assert.Equal(2, evaluated.Count);
        Assert.Contains(evaluated, d => d.SigneeInfo.OrganisationNumber == "910000000");
        Assert.DoesNotContain(evaluated, d => d.Id == "existing-same-signee");
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("null")]
    public async Task HandleSignMessage_UnparseablePayload_FailsPermanently(string payload)
    {
        ServiceTaskExchangeResult result = await Handle(
            new ServiceTaskReply
            {
                Payload = payload,
                IdempotencyKey = IdempotencyKey,
                AcceptedAt = _acceptedAt,
                Position = 0,
            }
        );

        AssertPermanentFailure(result);
    }

    [Fact]
    public async Task HandleSignMessage_UnknownVersion_FailsPermanently()
    {
        ServiceTaskExchangeResult result = await Handle(Reply(Message() with { Version = 2 }));

        ServiceTaskFailedResult failed = AssertPermanentFailure(result);
        Assert.Contains("version 2", failed.ErrorMessage);
    }

    [Fact]
    public async Task HandleSignMessage_ElementSetMismatch_FailsPermanently()
    {
        SignMessage message = Message() with { DataElementIds = ["33333333-3333-3333-3333-333333333333"] };

        ServiceTaskExchangeResult result = await Handle(Reply(message));

        ServiceTaskFailedResult failed = AssertPermanentFailure(result);
        Assert.Contains("33333333-3333-3333-3333-333333333333", failed.ErrorMessage);
        Assert.Contains(_modelElement.Id, failed.ErrorMessage);
    }

    [Fact]
    public async Task HandleSignMessage_DataReadFailure_Propagates()
    {
        _dataMutator
            .Setup(x => x.GetBinaryData(It.Is<DataElementIdentifier>(id => id.Id == _modelElement.Id)))
            .ThrowsAsync(new IOException("storage unavailable"));

        await Assert.ThrowsAsync<IOException>(() => Handle(Reply(Message())));

        Assert.Empty(_addedSignatures);
    }

    [Fact]
    public async Task HandleSignMessage_SendsTheReceiptKeyedOnTheMessageId()
    {
        List<AltinnEnvironmentConfig> resources = [new() { Environment = "tt02", Value = "app_ttd_receipt" }];
        _signatureConfiguration.CorrespondenceResources = resources;
        _signingReceiptService
            .Setup(x =>
                x.SendSignatureReceipt(
                    It.Is<Core.Internal.Sign.Signee>(s => s.UserId == "1337" && s.PersonNumber == "12345678901"),
                    It.Is<IEnumerable<DataElementSignature>>(s => s.Single().DataElementId == _modelElement.Id),
                    _dataMutator.Object,
                    "nb",
                    IdempotencyKey,
                    resources,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Core.Features.Correspondence.Models.SendCorrespondenceResponse?)null)
            .Verifiable(Times.Once);

        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        _signingReceiptService.Verify();
    }

    [Fact]
    public async Task HandleSignMessage_ReceiptFailure_DoesNotFailTheMessage()
    {
        _signatureConfiguration.CorrespondenceResources = [new() { Environment = "tt02", Value = "app_ttd_receipt" }];
        _signingReceiptService
            .Setup(x =>
                x.SendSignatureReceipt(
                    It.IsAny<Core.Internal.Sign.Signee>(),
                    It.IsAny<IEnumerable<DataElementSignature>>(),
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string?>(),
                    It.IsAny<string>(),
                    It.IsAny<List<AltinnEnvironmentConfig>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("correspondence down"));

        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.Single(_addedSignatures);
    }

    [Fact]
    public async Task HandleSignMessage_WithoutCorrespondenceResources_SendsNoReceipt()
    {
        ServiceTaskExchangeResult result = await Handle(Reply(Message()));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        _signingReceiptService.VerifyNoOtherCalls();
    }

    private static ServiceTaskFailedResult AssertPermanentFailure(ServiceTaskExchangeResult result)
    {
        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains(IdempotencyKey, failed.ErrorMessage);
        return failed;
    }

    private Task<ServiceTaskExchangeResult> Handle(ServiceTaskReply reply, ServiceTaskContext? context = null)
    {
        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(_task.ResolvePipeline().Items[^1]);
        return exchange.OnMessage(context ?? Context(Guid.NewGuid()), reply);
    }

    private ServiceTaskContext Context(Guid stepId) =>
        new()
        {
            InstanceDataMutator = _dataMutator.Object,
            WorkflowId = Guid.NewGuid(),
            StepId = stepId,
        };

    private SignMessage Message() =>
        new()
        {
            Version = SignMessage.CurrentVersion,
            RequestId = IdempotencyKey,
            Signee = new SignMessage.SigneeInfo { UserId = "1337", PersonNumber = "12345678901" },
            Language = "nb",
            DataElementIds = [_modelElement.Id],
        };

    private static ServiceTaskReply Reply(SignMessage message, string idempotencyKey = IdempotencyKey) =>
        new()
        {
            Payload = JsonSerializer.Serialize(message),
            IdempotencyKey = idempotencyKey,
            AcceptedAt = _acceptedAt,
            Position = 0,
        };

    private SignDocument ExistingDocument(StorageSignee signee) =>
        new()
        {
            Id = signee.OrganisationNumber is null ? "existing-same-signee" : "existing-on-behalf-of",
            InstanceGuid = _instanceGuid.ToString(),
            SignedTime = _acceptedAt.UtcDateTime.AddDays(-1),
            SigneeInfo = signee,
            DataElementSignatures =
            [
                new SignDocument.DataElementSignature
                {
                    DataElementId = _modelElement.Id,
                    Sha256Hash = "stale",
                    Signed = true,
                },
            ],
        };

    private DataElement AddExistingSignature(SignDocument document)
    {
        DataElement element = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = SignatureDataType,
            ContentType = "application/json",
            Filename = "signature.json",
        };
        _instance.Data.Add(element);
        _dataMutator
            .Setup(x => x.GetBinaryData(It.Is<DataElementIdentifier>(id => id.Id == element.Id)))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(document));
        return element;
    }

    private static SigneeContext SignedContext(string taskId, SignDocument document) =>
        new()
        {
            TaskId = taskId,
            Signee = new PersonSignee
            {
                Party = new Party(),
                SocialSecurityNumber = document.SigneeInfo.PersonNumber ?? string.Empty,
                FullName = "Signee",
            },
            SigneeState = new SigneeContextState(),
            SignDocument = document,
        };
}
