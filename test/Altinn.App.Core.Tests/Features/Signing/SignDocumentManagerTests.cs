using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using Person = Altinn.Platform.Register.Models.Person;
using Signee = Altinn.App.Core.Features.Signing.Models.Signee;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Signing;

public sealed class SignDocumentManagerTests : IDisposable
{
    private readonly Mock<IAltinnPartyClient> _altinnPartyClient = new(MockBehavior.Strict);
    private readonly Mock<ILogger<SigningService>> _logger = new();
    private readonly SignDocumentManager _signDocumentManager;
    private readonly ServiceProvider _serviceProvider;

    public SignDocumentManagerTests()
    {
        var services = new ServiceCollection();
        services.AddSingleton(_altinnPartyClient.Object);
        _serviceProvider = services.BuildServiceProvider();

        _signDocumentManager = new SignDocumentManager(_altinnPartyClient.Object, _logger.Object);

        // Setup default party lookup behavior
        _altinnPartyClient
            .Setup(x => x.LookupParty(It.IsAny<PartyLookup>()))
            .ReturnsAsync(
                (PartyLookup lookup) =>
                {
                    if (lookup.Ssn is not null)
                    {
                        return new Party
                        {
                            SSN = lookup.Ssn,
                            Name = "Test Person",
                            Person = new Person { SSN = lookup.Ssn, Name = "Test Person" },
                        };
                    }

                    if (lookup.OrgNo is not null)
                    {
                        return new Party
                        {
                            OrgNumber = lookup.OrgNo,
                            Name = "Test Organization",
                            Organization = new Organization { OrgNumber = lookup.OrgNo, Name = "Test Organization" },
                        };
                    }

                    return null!;
                }
            );
    }

    public void Dispose() => _serviceProvider.Dispose();

    // Helper methods to create test objects
    private static SignDocument CreateSignDocument(string? personNumber, string? orgNumber, Guid? systemUserId)
    {
        return new SignDocument
        {
            SigneeInfo = new StorageSignee
            {
                PersonNumber = personNumber,
                OrganisationNumber = orgNumber,
                SystemUserId = systemUserId,
            },
        };
    }

    private static PersonSignee CreatePersonSignee(string ssn, string name)
    {
        var party = new Party
        {
            SSN = ssn,
            Name = name,
            Person = new Person { SSN = ssn, Name = name },
        };

        return new PersonSignee
        {
            SocialSecurityNumber = ssn,
            FullName = name,
            Party = party,
        };
    }

    private static PersonOnBehalfOfOrgSignee CreatePersonOnBehalfOfOrgSignee(
        string ssn,
        string name,
        string orgNumber,
        string orgName
    )
    {
        var party = new Party
        {
            SSN = ssn,
            Name = name,
            Person = new Person { SSN = ssn, Name = name },
        };

        var orgParty = new Party
        {
            OrgNumber = orgNumber,
            Name = orgName,
            Organization = new Organization { OrgNumber = orgNumber, Name = orgName },
        };

        return new PersonOnBehalfOfOrgSignee
        {
            SocialSecurityNumber = ssn,
            FullName = name,
            Party = party,
            OnBehalfOfOrg = new OrganizationSignee
            {
                OrgNumber = orgNumber,
                OrgName = orgName,
                OrgParty = orgParty,
            },
        };
    }

    private static SystemUserSignee CreateSystemUserSignee(Guid systemId, string orgNumber, string orgName)
    {
        var party = new Party
        {
            OrgNumber = orgNumber,
            Name = orgName,
            Organization = new Organization { OrgNumber = orgNumber, Name = orgName },
        };
        return new SystemUserSignee
        {
            SystemId = systemId,
            OnBehalfOfOrg = new OrganizationSignee
            {
                OrgNumber = orgNumber,
                OrgName = orgName,
                OrgParty = party,
            },
        };
    }

    private static OrganizationSignee CreateOrganizationSignee(string orgNumber, string orgName)
    {
        var party = new Party
        {
            OrgNumber = orgNumber,
            Name = orgName,
            Organization = new Organization { OrgNumber = orgNumber, Name = orgName },
        };

        return new OrganizationSignee
        {
            OrgNumber = orgNumber,
            OrgName = orgName,
            OrgParty = party,
        };
    }

    private static SigneeContext CreateSigneeContext(string taskId, Signee signee, SignDocument? signDocument = null)
    {
        return new SigneeContext
        {
            TaskId = taskId,
            Signee = signee,
            SigneeState = new SigneeContextState { IsAccessDelegated = false },
            SignDocument = signDocument,
        };
    }

    [Fact]
    public async Task GetSignDocuments_WithValidDataElements_ReturnsSignDocuments()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "signature" };

        var signDocumentDataElement1 = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        var signDocumentDataElement2 = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = signatureConfiguration.SignatureDataType,
        };

        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "task1" } },
            Data = [signDocumentDataElement1, signDocumentDataElement2],
        };

        // Create SignDocument objects with their SigneeInfo properties
        var signDocument1 = CreateSignDocument("12345678901", null, null);
        var signDocument2 = CreateSignDocument("10987654321", null, null);

        var cachedInstanceMutator = new Mock<IInstanceDataMutator>();
        cachedInstanceMutator.Setup(x => x.Instance).Returns(instance);

        cachedInstanceMutator
            .Setup(x => x.GetBinaryData(new DataElementIdentifier(signDocumentDataElement1.Id)))
            .ReturnsAsync(new ReadOnlyMemory<byte>(ToBytes(signDocument1)));

        cachedInstanceMutator
            .Setup(x => x.GetBinaryData(new DataElementIdentifier(signDocumentDataElement2.Id)))
            .ReturnsAsync(new ReadOnlyMemory<byte>(ToBytes(signDocument2)));

        // Act
        var result = await _signDocumentManager.GetSignDocuments(
            cachedInstanceMutator.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal("12345678901", result[0].SigneeInfo.PersonNumber);
        Assert.Equal("10987654321", result[1].SigneeInfo.PersonNumber);
    }

    [Fact]
    public async Task GetSignDocuments_WithNoSignatureDataType_ThrowsApplicationConfigException()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = null };
        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _signDocumentManager.GetSignDocuments(
                instanceDataAccessor.Object,
                signatureConfiguration,
                CancellationToken.None
            )
        );

        Assert.Equal("SignatureDataType is not set in the signature configuration.", exception.Message);
    }

    [Fact]
    public async Task GetSignDocuments_WithNoDataElements_ReturnsEmptyList()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "signature" };

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();

        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "task1" } },
            Data = [],
        };
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);

        instanceDataAccessor
            .Setup(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()))
            .ReturnsAsync(new ReadOnlyMemory<byte>([]));

        // Act
        var result = await _signDocumentManager.GetSignDocuments(
            instanceDataAccessor.Object,
            signatureConfiguration,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSignDocuments_WithInvalidJsonData_ThrowsException()
    {
        // Arrange
        var signatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "signature" };

        var signatureDataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "signature" };

        var instanceDataAccessor = new Mock<IInstanceDataAccessor>();
        var instance = new Instance
        {
            Id = new InstanceIdentifier(123, Guid.NewGuid()).ToString(),
            AppId = "ttd/app1",
            InstanceOwner = new InstanceOwner { PartyId = Guid.NewGuid().ToString(), OrganisationNumber = "ttd" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "task1" } },
            Data = [signatureDataElement],
        };
        instanceDataAccessor.Setup(x => x.Instance).Returns(instance);

        instanceDataAccessor
            .Setup(x => x.GetBinaryData(signatureDataElement))
            .ReturnsAsync(new ReadOnlyMemory<byte>(Encoding.UTF8.GetBytes("invalid json")));

        // Act & Assert
        await Assert.ThrowsAsync<JsonException>(() =>
            _signDocumentManager.GetSignDocuments(
                instanceDataAccessor.Object,
                signatureConfiguration,
                CancellationToken.None
            )
        );
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithMatchingPersonSignee_UpdatesSigneeContext()
    {
        // Arrange
        var taskId = "Task_1";

        var personSignee = CreatePersonSignee("12345678901", "Test Person");
        var signeeContext = CreateSigneeContext(taskId, personSignee);
        var signDocument = CreateSignDocument("12345678901", null, null);

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            [signeeContext],
            [signDocument],
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        SigneeContext updatedSigneeContext = result[0];
        Assert.NotNull(updatedSigneeContext.SignDocument);
        Assert.Equal(signDocument, updatedSigneeContext.SignDocument);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithMatchingPersonOnBehalfOfOrgSignee_UpdatesSigneeContext()
    {
        // Arrange
        var taskId = "Task_1";

        var personOnBehalfOfOrgSignee = CreatePersonOnBehalfOfOrgSignee(
            "12345678901",
            "Test Person",
            "123456789",
            "Test Organization"
        );
        var signeeContext = CreateSigneeContext(taskId, personOnBehalfOfOrgSignee);
        var signDocument = CreateSignDocument("12345678901", "123456789", null);

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            [signeeContext],
            [signDocument],
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        SigneeContext updatedSigneeContext = result[0];
        Assert.NotNull(updatedSigneeContext.SignDocument);
        Assert.Equal(signDocument, updatedSigneeContext.SignDocument);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithMatchingSystemUserSignee_UpdatesSigneeContext()
    {
        // Arrange
        var taskId = "Task_1";
        var systemId = new Guid("11111111-1111-1111-1111-111111111111");

        var systemUserSignee = CreateSystemUserSignee(systemId, "123456789", "Test Organization");
        var signeeContext = CreateSigneeContext(taskId, systemUserSignee);
        var signDocument = CreateSignDocument(null, "123456789", systemId);

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            [signeeContext],
            [signDocument],
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        SigneeContext updatedSigneeContext = result[0];
        Assert.NotNull(updatedSigneeContext.SignDocument);
        Assert.Equal(signDocument, updatedSigneeContext.SignDocument);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithMatchingOrgSignee_UpdatesSigneeContext()
    {
        // Arrange
        var taskId = "Task_1";

        var orgSignee = CreateOrganizationSignee("123456789", "Test Organization");
        var signeeContext = CreateSigneeContext(taskId, orgSignee);
        var signDocument = CreateSignDocument("12345678901", "123456789", null);

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            [signeeContext],
            [signDocument],
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        SigneeContext updatedSigneeContext = result[0];
        Assert.NotNull(updatedSigneeContext.SignDocument);
        Assert.Equal(signDocument, updatedSigneeContext.SignDocument);

        // Verify that the org signee was converted to a person on behalf of org signee
        Assert.IsType<PersonOnBehalfOfOrgSignee>(updatedSigneeContext.Signee);
        var convertedSignee = (PersonOnBehalfOfOrgSignee)updatedSigneeContext.Signee;
        Assert.Equal("12345678901", convertedSignee.SocialSecurityNumber);
        Assert.Equal("123456789", convertedSignee.OnBehalfOfOrg.OrgNumber);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithOrgSigneeAndSystemUser_ConvertsToSystemUserSignee()
    {
        // Arrange
        var taskId = "Task_1";
        var systemId = new Guid("11111111-1111-1111-1111-111111111111");

        var orgSignee = CreateOrganizationSignee("123456789", "Test Organization");
        var signeeContext = CreateSigneeContext(taskId, orgSignee);
        var signDocument = CreateSignDocument(null, "123456789", systemId);

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            [signeeContext],
            [signDocument],
            CancellationToken.None
        );

        // Assert
        Assert.Single(result);
        SigneeContext updatedSigneeContext = result[0];
        Assert.NotNull(updatedSigneeContext.SignDocument);
        Assert.Equal(signDocument, updatedSigneeContext.SignDocument);

        // Verify that the org signee was converted to a system signee
        Assert.IsType<SystemUserSignee>(updatedSigneeContext.Signee);
        var convertedSignee = (SystemUserSignee)updatedSigneeContext.Signee;
        Assert.Equal(systemId, convertedSignee.SystemId);
        Assert.Equal("123456789", convertedSignee.OnBehalfOfOrg.OrgNumber);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithUnmatchedSignDocument_CreatesNewSigneeContext()
    {
        // Arrange
        var taskId = "Task_1";

        var personSignee = CreatePersonSignee("12345678901", "Test Person");
        var signeeContext = CreateSigneeContext(taskId, personSignee);

        var signDocument1 = CreateSignDocument("12345678901", null, null);
        var signDocument2 = CreateSignDocument("10987654321", null, null);

        var signeeContexts = new List<SigneeContext> { signeeContext };

        // Act
        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            taskId,
            signeeContexts,
            [signDocument1, signDocument2],
            CancellationToken.None
        );

        // Assert
        Assert.Equal(2, result.Count);

        // First context should be matched with first document
        Assert.NotNull(result[0].SignDocument);
        Assert.Equal(signDocument1, result[0].SignDocument);

        // Second context should be created for second document
        Assert.NotNull(result[1].SignDocument);
        Assert.Equal(signDocument2, result[1].SignDocument);
        Assert.Equal(taskId, result[1].TaskId);
        Assert.IsType<PersonSignee>(result[1].Signee);
        Assert.True(result[1].SigneeState.IsAccessDelegated);
        Assert.True(result[1].SigneeState.HasBeenMessagedForCallToSign);
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithInvalidSigneeType_ThrowsInvalidOperationException()
    {
        // Arrange
        var taskId = "Task_1";

        // Create a mock signee that doesn't match any of the expected types
        var mockSignee = new Mock<Signee>();

        var signeeContext = new SigneeContext
        {
            TaskId = taskId,
            Signee = mockSignee.Object,
            SigneeState = new SigneeContextState { IsAccessDelegated = false },
        };

        var signDocument = CreateSignDocument("12345678901", null, null);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
                taskId,
                [signeeContext],
                [signDocument],
                CancellationToken.None
            )
        );
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithMultiplePersonOrgAndSystemSignatures_MatchesCorrectSignatureContexts()
    {
        var systemUserId1 = new Guid("11111111-1111-1111-1111-111111111111");
        var systemUserId2 = new Guid("22222222-2222-2222-2222-222222222222");

        var person1 = new Person { SSN = "11111111111", Name = "Test Testesen 1" };
        var person2 = new Person { SSN = "22222222222", Name = "Test Testesen 2" };

        var org1 = new Organization { OrgNumber = "111111111", Name = "TestOrg 1" };
        var org2 = new Organization { OrgNumber = "222222222", Name = "TestOrg 2" };
        var unmatchedOrg = new Organization { OrgNumber = "12324323423", Name = "UnmatchedOrg" };

        List<SignDocument> signDocuments =
        [
            CreateSignDocument(person1.SSN, null, null),
            CreateSignDocument(person2.SSN, null, null),
            CreateSignDocument(person1.SSN, org1.OrgNumber, null),
            CreateSignDocument(person2.SSN, org1.OrgNumber, null),
            CreateSignDocument(null, org1.OrgNumber, systemUserId1),
            CreateSignDocument(null, org2.OrgNumber, systemUserId2),
        ];

        List<SigneeContext> signeeContexts =
        [
            CreateSigneeContext("Task_1", CreateOrganizationSignee(org2.OrgNumber, org2.Name)),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(org1.OrgNumber, org1.Name)),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(org1.OrgNumber, org1.Name)),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(org1.OrgNumber, org1.Name)),
            CreateSigneeContext("Task_1", CreatePersonSignee(person2.SSN, person2.Name)),
            CreateSigneeContext("Task_1", CreatePersonSignee(person1.SSN, person1.Name)),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(unmatchedOrg.OrgNumber, unmatchedOrg.Name)),
        ];

        List<SigneeContext> expected =
        [
            CreateSigneeContext("Task_1", CreatePersonSignee(person2.SSN, person2.Name), signDocuments[1]),
            CreateSigneeContext("Task_1", CreatePersonSignee(person1.SSN, person1.Name), signDocuments[0]),
            CreateSigneeContext(
                "Task_1",
                CreateSystemUserSignee(systemUserId2, org2.OrgNumber, org2.Name),
                signDocuments[5]
            ),
            CreateSigneeContext(
                "Task_1",
                CreatePersonOnBehalfOfOrgSignee(person1.SSN, "Test Person", org1.OrgNumber, org1.Name),
                signDocuments[2]
            ),
            CreateSigneeContext(
                "Task_1",
                CreatePersonOnBehalfOfOrgSignee(person2.SSN, "Test Person", org1.OrgNumber, org1.Name),
                signDocuments[3]
            ),
            CreateSigneeContext(
                "Task_1",
                CreateSystemUserSignee(systemUserId1, org1.OrgNumber, org1.Name),
                signDocuments[4]
            ),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(unmatchedOrg.OrgNumber, unmatchedOrg.Name)),
        ];

        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            "Task_1",
            signeeContexts,
            signDocuments,
            CancellationToken.None
        );

        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(result));
    }

    [Fact]
    public async Task SynchronizeSigneeContextsWithSignDocuments_WithDifferentOrder_ShouldReturnSameResult()
    {
        var ssn = "12345678910";
        var orgNumber = "987654321";
        Guid systemUserId = new("11111111-1111-1111-1111-111111111111");

        List<SignDocument> signDocuments =
        [
            CreateSignDocument(ssn, orgNumber, null),
            CreateSignDocument(null, orgNumber, systemUserId),
        ];

        List<SigneeContext> signeeContexts =
        [
            CreateSigneeContext("Task_1", CreateOrganizationSignee(orgNumber, "TestOrg")),
            CreateSigneeContext("Task_1", CreateSystemUserSignee(systemUserId, orgNumber, "TestOrg")),
            CreateSigneeContext("Task_1", CreatePersonOnBehalfOfOrgSignee(ssn, "Test Testesen", orgNumber, "TestOrg")),
        ];

        List<SigneeContext> expected =
        [
            CreateSigneeContext("Task_1", CreateSystemUserSignee(systemUserId, orgNumber, "TestOrg"), signDocuments[1]),
            CreateSigneeContext(
                "Task_1",
                CreatePersonOnBehalfOfOrgSignee(ssn, "Test Testesen", orgNumber, "TestOrg"),
                signDocuments[0]
            ),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(orgNumber, "TestOrg")),
        ];

        var result = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            "Task_1",
            signeeContexts,
            signDocuments,
            CancellationToken.None
        );
        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(result));

        List<SigneeContext> signeeContextsReversed = [.. signeeContexts];
        signeeContextsReversed.Reverse();

        List<SigneeContext> expectedReversed =
        [
            CreateSigneeContext(
                "Task_1",
                CreatePersonOnBehalfOfOrgSignee(ssn, "Test Testesen", orgNumber, "TestOrg"),
                signDocuments[0]
            ),
            CreateSigneeContext("Task_1", CreateSystemUserSignee(systemUserId, orgNumber, "TestOrg"), signDocuments[1]),
            CreateSigneeContext("Task_1", CreateOrganizationSignee(orgNumber, "TestOrg")),
        ];

        var reversedResult = await _signDocumentManager.SynchronizeSigneeContextsWithSignDocuments(
            "Task_1",
            signeeContextsReversed,
            signDocuments,
            CancellationToken.None
        );

        Assert.Equal(JsonSerializer.Serialize(expectedReversed), JsonSerializer.Serialize(reversedResult));
    }

    private static byte[] ToBytes<T>(T obj)
    {
        return Encoding.UTF8.GetBytes(JsonSerializer.Serialize(obj));
    }
}
