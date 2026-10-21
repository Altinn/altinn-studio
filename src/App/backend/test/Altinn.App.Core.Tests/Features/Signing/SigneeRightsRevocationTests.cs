using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Signing;

/// <summary>
/// When a signing task ends, the rights delegated to its signees are revoked from the parties they were delegated
/// to. This runs the end of the task through the real signee state, signature documents and delegation service.
/// </summary>
public sealed class SigneeRightsRevocationTests : IDisposable
{
    private const string TaskId = "Task_Signing";
    private const string SigneeStatesDataTypeId = "signeeStates";
    private const string SignatureDataTypeId = "signatures";
    private const string OrgPartyUuid = "8f5b2b0c-4a2f-4bde-9f3e-1c0f2b6a7d11";

    /// <summary>
    /// The signee state an app on v8 saved when it delegated to an organization signee. v8 did not record the party
    /// it delegated to.
    /// </summary>
    private const string OrganizationSigneeStateSavedByV8 = """
        {
          "$id": "1",
          "$values": [
            {
              "$id": "2",
              "taskId": "Task_Signing",
              "Signee": {
                "$id": "3",
                "$type": "organization",
                "OrgParty": {
                  "$id": "4",
                  "PartyId": 500600,
                  "PartyUuid": "8f5b2b0c-4a2f-4bde-9f3e-1c0f2b6a7d11",
                  "PartyTypeName": "organisation",
                  "OrgNumber": "312345678",
                  "SSN": null,
                  "UnitType": null,
                  "Name": "Testorganisasjon AS",
                  "IsDeleted": false,
                  "OnlyHierarchyElementWithNoAccess": false,
                  "Person": null,
                  "Organization": null,
                  "ChildParties": null
                },
                "OrgNumber": "312345678",
                "OrgName": "Testorganisasjon AS"
              },
              "CommunicationConfig": null,
              "additionalActionsToDelegate": {
                "$id": "5",
                "$values": [
                  "reject"
                ]
              },
              "signeeState": {
                "$id": "6",
                "isAccessDelegated": true,
                "delegationFailedReason": null,
                "hasBeenMessagedForCallToSign": true,
                "ctaCorrespondenceId": "0d6c3f7e-2b8a-4c55-9a51-7e4f3a2c9b20",
                "callToSignFailedReason": null
              }
            }
          ]
        }
        """;

    private static readonly Party _personParty = new()
    {
        PartyId = 500700,
        PartyUuid = Guid.NewGuid(),
        SSN = "12345678901",
        Name = "Testperson",
    };

    private static readonly Party _instanceOwnerParty = new()
    {
        PartyId = 501337,
        PartyUuid = Guid.NewGuid(),
        SSN = "01017012345",
        Name = "Instance Owner",
    };

    private readonly ServiceProvider _serviceProvider;
    private readonly Mock<IAltinnPartyClient> _altinnPartyClient = new();
    private readonly Mock<IAccessManagementClient> _accessManagementClient = new();
    private readonly List<DelegationRequest> _revocations = [];
    private readonly SigningService _signingService;

    public void Dispose() => _serviceProvider.Dispose();

    public SigneeRightsRevocationTests()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        _serviceProvider = services.BuildServiceProvider();

        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(x => x.EnvironmentName).Returns("Development");

        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.ApplicationMetadata)
            .Returns(
                new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        new DataType { Id = SigneeStatesDataTypeId, ActionRequiredToRead = "restricted-read" },
                        new DataType { Id = SignatureDataTypeId, ActionRequiredToRead = "restricted-read" },
                    ],
                }
            );

        _altinnPartyClient
            .Setup(x =>
                x.LookupParty(
                    It.IsAny<PartyLookup>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (PartyLookup lookup, StorageAuthenticationMethod? _, CancellationToken _) =>
                    lookup.Ssn == _personParty.SSN ? _personParty
                    : lookup.Ssn == _instanceOwnerParty.SSN ? _instanceOwnerParty
                    : throw new InvalidOperationException("Unexpected party lookup")
            );

        _accessManagementClient
            .Setup(x => x.RevokeRights(It.IsAny<DelegationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DelegationRequest, CancellationToken>((request, _) => _revocations.Add(request))
            .ReturnsAsync(new DelegationResponse());

        _signingService = new SigningService(
            hostEnvironment.Object,
            _altinnPartyClient.Object,
            new Mock<IAltinnCdnClient>().Object,
            new SigningDelegationService(
                _accessManagementClient.Object,
                new Mock<ILogger<SigningDelegationService>>().Object
            ),
            appMetadata.Object,
            new Mock<ISigningCallToActionService>().Object,
            new Mock<IAuthorizationClient>().Object,
            new Mock<ILogger<SigningService>>().Object,
            new SigneeContextsManager(
                _altinnPartyClient.Object,
                _serviceProvider.GetRequiredService<AppImplementationFactory>(),
                appMetadata.Object,
                new Mock<ILogger<SigneeContextsManager>>().Object
            ),
            new SignDocumentManager(
                _altinnPartyClient.Object,
                appMetadata.Object,
                new Mock<ILogger<SigningService>>().Object
            )
        );
    }

    [Theory]
    [InlineData("v8")]
    [InlineData("v9")]
    public async Task RevokeSigneeRightsOnTaskEnd_AfterAPersonSignedForTheOrganization_RevokesFromTheOrganization(
        string savedBy
    )
    {
        // Arrange
        string signeeState =
            savedBy == "v8"
                ? OrganizationSigneeStateSavedByV8
                : OrganizationSigneeStateSavedByV8.Replace(
                    "\"isAccessDelegated\": true,",
                    $"\"isAccessDelegated\": true, \"delegatedToPartyUuid\": \"{OrgPartyUuid}\","
                );
        SignDocument signDocument = new()
        {
            SigneeInfo = new StorageSignee { PersonNumber = _personParty.SSN, OrganisationNumber = "312345678" },
        };
        IInstanceDataMutator instanceDataMutator = CreateInstanceDataMutator(signeeState, signDocument);

        // Act
        await _signingService.RevokeSigneeRightsOnTaskEnd(
            instanceDataMutator,
            new AltinnSignatureConfiguration
            {
                SigneeStatesDataTypeId = SigneeStatesDataTypeId,
                SignatureDataType = SignatureDataTypeId,
            },
            CancellationToken.None
        );

        // Assert
        DelegationRequest revocation = Assert.Single(_revocations);
        Assert.Equal(OrgPartyUuid, revocation.To!.Value);
        Assert.Equal(_instanceOwnerParty.PartyUuid.ToString(), revocation.From!.Value);
        Assert.Equal(["read", "sign", "reject"], revocation.Rights.Select(right => right.Action!.Value));
    }

    private static IInstanceDataMutator CreateInstanceDataMutator(string signeeState, SignDocument signDocument)
    {
        DataElement signeeStateElement = new() { Id = Guid.NewGuid().ToString(), DataType = SigneeStatesDataTypeId };
        DataElement signatureElement = new() { Id = Guid.NewGuid().ToString(), DataType = SignatureDataTypeId };
        Instance instance = new()
        {
            Id = $"{_instanceOwnerParty.PartyId}/{Guid.NewGuid()}",
            AppId = "ttd/app",
            InstanceOwner = new InstanceOwner
            {
                PartyId = _instanceOwnerParty.PartyId.ToString(),
                PersonNumber = _instanceOwnerParty.SSN,
            },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = TaskId } },
            Data = [signeeStateElement, signatureElement],
        };

        var instanceDataMutator = new Mock<IInstanceDataMutator>();
        instanceDataMutator.Setup(x => x.Instance).Returns(instance);
        instanceDataMutator.Setup(x => x.TaskId).Returns(TaskId);
        instanceDataMutator
            .Setup(x => x.GetBinaryData(signeeStateElement))
            .ReturnsAsync(Encoding.UTF8.GetBytes(signeeState));
        instanceDataMutator
            .Setup(x => x.GetBinaryData(signatureElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(signDocument));
        return instanceDataMutator.Object;
    }
}
