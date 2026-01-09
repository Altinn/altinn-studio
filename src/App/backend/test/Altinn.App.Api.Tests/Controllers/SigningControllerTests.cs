using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using SigneeContextState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;

namespace Altinn.App.Api.Tests.Controllers;

public class SigningControllerTests
{
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<ISigningService> _signingServiceMock = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _applicationMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _serviceCollection = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock = new(MockBehavior.Strict);

    private readonly AltinnTaskExtension _altinnTaskExtension = new()
    {
        SignatureConfiguration = new AltinnSignatureConfiguration
        {
            DataTypesToSign = ["dataTypeToSign1", "dataTypeToSign2"],
            SignatureDataType = "signatureDataType",
            SigneeProviderId = "signeeProviderId",
            SigneeStatesDataTypeId = "signeeStatesDataTypeId",
            SigningPdfDataType = "signingPdfDataType",
            CorrespondenceResources = [],
            RunDefaultValidator = true,
        },
    };

    public SigningControllerTests(ITestOutputHelper output)
    {
        _serviceCollection.AddTransient<ModelSerializationService>();
        _serviceCollection.AddTransient<InstanceDataUnitOfWorkInitializer>();
        _serviceCollection.AddTransient<SigningController>();
        _serviceCollection.AddSingleton(Options.Create(new FrontEndSettings()));
        _serviceCollection.AddSingleton(_instanceClientMock.Object);
        _serviceCollection.AddSingleton(_signingServiceMock.Object);
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton(_applicationMetadataMock.Object);
        _serviceCollection.AddSingleton(_translationServiceMock.Object);
        _serviceCollection.AddSingleton(_appResourcesMock.Object);
        _serviceCollection.AddSingleton(_processReaderMock.Object);
        _serviceCollection.AddSingleton(_httpContextAccessorMock.Object);
        _serviceCollection.AddFakeLoggingWithXunit(output);

        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(
                new Instance
                {
                    InstanceOwner = new InstanceOwner { PartyId = "1337" },
                    Process = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "signing" },
                    },
                }
            );

        _processReaderMock.Setup(s => s.GetAltinnTaskExtension(It.IsAny<string>())).Returns(_altinnTaskExtension);
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        _applicationMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        // this test does not verify the data types
                    ],
                }
            );
    }

    [Fact]
    public async Task GetSigneesState_WhenSigneeContextIsOrg_Returns_Expected_Signees()
    {
        // Arrange
        var signedTime = DateTime.Now;
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        List<SigneeContext> signeeContexts =
        [
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new OrganizationSignee
                {
                    OrgName = "org1",
                    OrgNumber = "123456789",
                    OrgParty = new Party { PartyId = 1 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = "delegationFailedReason",
                    IsAccessDelegated = false,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = "callToSignFailedReason",
                },
                SignDocument = null,
            },
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new OrganizationSignee
                {
                    OrgName = "org1",
                    OrgNumber = "123456789",
                    OrgParty = new Party { PartyId = 1 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = null,
                },
                SignDocument = new SignDocument
                {
                    DataElementSignatures = [],
                    Id = "signDocument",
                    InstanceGuid = "instanceGuid",
                    SignedTime = signedTime,
                },
            },
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new OrganizationSignee
                {
                    OrgName = "org2",
                    OrgNumber = "987654321",
                    OrgParty = new Party { PartyId = 2 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = "callToSignFailedReason",
                },
                SignDocument = new SignDocument
                {
                    DataElementSignatures = [],
                    Id = "signDocument",
                    InstanceGuid = "instanceGuid",
                    SignedTime = signedTime,
                },
            },
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new OrganizationSignee
                {
                    OrgName = "org2",
                    OrgNumber = "987654321",
                    OrgParty = new Party { PartyId = 2 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CallToSignFailedReason = null,
                },
            },
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new OrganizationSignee
                {
                    OrgName = "org2",
                    OrgNumber = "987654321",
                    OrgParty = new Party { PartyId = 2 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CallToSignFailedReason = null,
                },
            },
        ];
        _signingServiceMock
            .Setup(s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    _altinnTaskExtension.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var actionResult = await controller.GetSigneesState("tdd", "app", 1337, Guid.NewGuid(), CancellationToken.None);

        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingStateResponse = okResult.Value as SigningStateResponse;

        // Assert
        var expected = new SigningStateResponse
        {
            SigneeStates =
            [
                new SigneeState
                {
                    Name = null,
                    Organization = "org1",
                    DelegationSuccessful = false,
                    NotificationStatus = NotificationStatus.Failed,
                    SignedTime = null,
                    PartyId = 1,
                },
                new SigneeState
                {
                    Name = null,
                    Organization = "org1",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.NotSent,
                    SignedTime = signedTime,
                    PartyId = 1,
                },
                new SigneeState
                {
                    Name = null,
                    Organization = "org2",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.Failed,
                    SignedTime = signedTime,
                    PartyId = 2,
                },
                new SigneeState
                {
                    Name = null,
                    Organization = "org2",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.Sent,
                    SignedTime = null,
                    PartyId = 2,
                },
                new SigneeState
                {
                    Name = null,
                    Organization = "org2",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.Sent,
                    SignedTime = null,
                    PartyId = 2,
                },
            ],
        };

        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(signingStateResponse));
    }

    [Fact]
    public async Task GetSigneesState_WhenSigneeContextIsPerson_Returns_Expected_Signees()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        List<SigneeContext> signeeContexts =
        [
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new PersonSignee
                {
                    FullName = "person1",
                    SocialSecurityNumber = "123456789",
                    Party = new Party { PartyId = 1 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = "delegationFailedReason",
                    IsAccessDelegated = false,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = "callToSignFailedReason",
                },
                SignDocument = null,
            },
        ];
        _signingServiceMock
            .Setup(s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    _altinnTaskExtension.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var actionResult = await controller.GetSigneesState("tdd", "app", 1337, Guid.NewGuid(), CancellationToken.None);

        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingStateResponse = okResult.Value as SigningStateResponse;

        // Assert
        var expected = new SigningStateResponse
        {
            SigneeStates =
            [
                new SigneeState
                {
                    Name = "person1",
                    Organization = null,
                    DelegationSuccessful = false,
                    NotificationStatus = NotificationStatus.Failed,
                    SignedTime = null,
                    PartyId = 1,
                },
            ],
        };

        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(signingStateResponse));
    }

    [Fact]
    public async Task GetSigneesState_WhenSigneeContextIsPersonOnBehalfOfOrg_Returns_Expected_Signees()
    {
        // Arrange
        var signedTime = DateTime.Now;
        SetupAuthenticationContextMock();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        List<SigneeContext> signeeContexts =
        [
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new PersonOnBehalfOfOrgSignee
                {
                    FullName = "person1",
                    SocialSecurityNumber = "123456789",
                    Party = new Party { PartyId = 123 },
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = "org1",
                        OrgNumber = "123456789",
                        OrgParty = new Party { PartyId = 321 },
                    },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = null,
                },
                SignDocument = new SignDocument
                {
                    DataElementSignatures = [],
                    Id = "signDocument",
                    InstanceGuid = "instanceGuid",
                    SignedTime = signedTime,
                },
            },
        ];
        _signingServiceMock
            .Setup(s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    _altinnTaskExtension.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var actionResult = await controller.GetSigneesState("tdd", "app", 1337, Guid.NewGuid(), CancellationToken.None);

        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingStateResponse = okResult.Value as SigningStateResponse;

        // Assert
        var expected = new SigningStateResponse
        {
            SigneeStates =
            [
                new SigneeState
                {
                    Name = "person1",
                    Organization = "org1",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.NotSent,
                    SignedTime = signedTime,
                    PartyId = 123,
                },
            ],
        };

        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(signingStateResponse));
    }

    [Fact]
    public async Task GetSigneesState_WhenSigneeContextIsSystem_Returns_Expected_Signees()
    {
        // Arrange
        var signedTime = DateTime.Now;
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        List<SigneeContext> signeeContexts =
        [
            new SigneeContext
            {
                TaskId = "task1",
                Signee = new SystemUserSignee
                {
                    SystemId = Guid.NewGuid(),
                    OnBehalfOfOrg = new OrganizationSignee
                    {
                        OrgName = "org1",
                        OrgNumber = "123456789",
                        OrgParty = new Party { PartyId = 123 },
                    },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = true,
                    CallToSignFailedReason = null,
                },
                SignDocument = new SignDocument
                {
                    DataElementSignatures = [],
                    Id = "signDocument",
                    InstanceGuid = "instanceGuid",
                    SignedTime = signedTime,
                },
            },
        ];
        _signingServiceMock
            .Setup(s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    _altinnTaskExtension.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var actionResult = await controller.GetSigneesState("tdd", "app", 1337, Guid.NewGuid(), CancellationToken.None);

        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingStateResponse = okResult.Value as SigningStateResponse;

        // Assert
        var expected = new SigningStateResponse
        {
            SigneeStates =
            [
                new SigneeState
                {
                    Name = "System",
                    Organization = "org1",
                    DelegationSuccessful = true,
                    NotificationStatus = NotificationStatus.Sent,
                    SignedTime = signedTime,
                    PartyId = 123,
                },
            ],
        };

        Assert.Equal(JsonSerializer.Serialize(expected), JsonSerializer.Serialize(signingStateResponse));
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_Returns_Expected_Organizations()
    {
        // Arrange
        SetupAuthenticationContextMock(authenticated: CreateAuthenticatedUser());
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        List<OrganizationSignee> organisationSignees =
        [
            new OrganizationSignee
            {
                OrgName = "org1",
                OrgNumber = "123456789",
                OrgParty = new Party { PartyId = 1 },
            },
            new OrganizationSignee
            {
                OrgName = "org2",
                OrgNumber = "987654321",
                OrgParty = new Party { PartyId = 2 },
            },
        ];

        _signingServiceMock
            .Setup(s =>
                s.GetAuthorizedOrganizationSignees(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    _altinnTaskExtension.SignatureConfiguration!,
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(organisationSignees);

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None
        );

        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingAuthorizedOrganizationsResponse = okResult.Value as SigningAuthorizedOrganizationsResponse;

        // Assert
        var expected = new SigningAuthorizedOrganizationsResponse
        {
            Organizations =
            [
                new AuthorizedOrganizationDetails
                {
                    OrgName = "org1",
                    OrgNumber = "123456789",
                    PartyId = 1,
                },
                new AuthorizedOrganizationDetails
                {
                    OrgName = "org2",
                    OrgNumber = "987654321",
                    PartyId = 2,
                },
            ],
        };

        Assert.Equal(
            JsonSerializer.Serialize(expected),
            JsonSerializer.Serialize(signingAuthorizedOrganizationsResponse)
        );
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_TaskTypeIsNotSigning_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "not-signing" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None
        );

        // Assert
        Assert.IsType<BadRequestObjectResult>(actionResult);
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_UserIdIsNull_Returns_Unauthorized()
    {
        // Arrange
        SetupAuthenticationContextMock(authenticated: CreateAuthenticatedNone());
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None
        );

        // Assert
        Assert.IsType<UnauthorizedResult>(actionResult);
    }

    [Fact]
    public async Task GetDataElements_WhenTaskTypeIsSigning_Returns_ExpectedDataElements()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup controller context with request
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("localhost");
        request.Path = "/tdd/app/instances/1337/guid/signing/data-elements";

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var now = DateTime.UtcNow;

        // Create test instance with data elements
        var instance = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "signing" },
            },
            Data =
            [
                new DataElement
                {
                    Id = "dataElement1",
                    DataType = "dataTypeToSign1", // This matches the DataTypesToSign in _altinnTaskExtension
                    ContentType = "application/json",
                    Size = 100,
                    Filename = "file1.json",
                    Created = now,
                },
                new DataElement
                {
                    Id = "dataElement2",
                    DataType = "otherDataType", // This doesn't match the DataTypesToSign
                    ContentType = "application/json",
                    Size = 200,
                    Filename = "file2.json",
                    Created = now,
                },
                new DataElement
                {
                    Id = "dataElement3",
                    DataType = "dataTypeToSign2", // This matches the DataTypesToSign in _altinnTaskExtension
                    ContentType = "application/xml",
                    Size = 300,
                    Filename = "file3.xml",
                    Created = now,
                },
                new DataElement
                {
                    Id = "dataElement4",
                    DataType = "dataTypeToSign1", // This matches the DataTypesToSign in _altinnTaskExtension
                    ContentType = "application/xml",
                    Size = 400,
                    Filename = "file4.xml",
                    Created = now.AddMinutes(-1),
                },
            ],
        };

        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);

        // Act
        var actionResult = await controller.GetDataElements("tdd", "app", 1337, Guid.NewGuid());

        // Assert
        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingDataElementsResponse = okResult.Value as SigningDataElementsResponse;
        Assert.NotNull(signingDataElementsResponse);

        // Should only include data elements with DataType that matches DataTypesToSign
        Assert.Equal(3, signingDataElementsResponse.DataElements.Count);
        Assert.Contains(signingDataElementsResponse.DataElements, de => de.Id == "dataElement1");
        Assert.Contains(signingDataElementsResponse.DataElements, de => de.Id == "dataElement3");
        Assert.DoesNotContain(signingDataElementsResponse.DataElements, de => de.Id == "dataElement2");
        Assert.Contains(signingDataElementsResponse.DataElements, de => de.Id == "dataElement4");

        // The elements should be ordered according to the order in DataTypesToSign, then by Created
        Assert.Equal("dataElement4", signingDataElementsResponse.DataElements[0].Id);
        Assert.Equal("dataElement1", signingDataElementsResponse.DataElements[1].Id);
        Assert.Equal("dataElement3", signingDataElementsResponse.DataElements[2].Id);

        // Verify all data elements have self links set
        foreach (var dataElement in signingDataElementsResponse.DataElements)
        {
            Assert.NotNull(dataElement.SelfLinks);
            Assert.NotEmpty(dataElement.SelfLinks.Apps);
        }
    }

    [Fact]
    public async Task GetDataElements_WhenTaskTypeIsNotSigning_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "not-signing" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetDataElements("tdd", "app", 1337, Guid.NewGuid());

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
        Assert.Equal(StatusCodes.Status400BadRequest, problemDetails.Status);
    }

    [Fact]
    public async Task GetDataElements_WhenNoMatchingDataTypes_Returns_EmptyList()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup controller context with request
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("localhost");
        request.Path = "/tdd/app/instances/1337/guid/signing/data-elements";

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Create test instance with data elements that don't match the data types to sign
        var instance = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "signing" },
            },
            Data =
            [
                new DataElement
                {
                    Id = "dataElement1",
                    DataType = "otherDataType1", // Doesn't match DataTypesToSign
                    ContentType = "application/json",
                    Size = 100,
                    Filename = "file1.json",
                },
                new DataElement
                {
                    Id = "dataElement2",
                    DataType = "otherDataType2", // Doesn't match DataTypesToSign
                    ContentType = "application/json",
                    Size = 200,
                    Filename = "file2.json",
                },
            ],
        };

        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);

        // Act
        var actionResult = await controller.GetDataElements("tdd", "app", 1337, Guid.NewGuid());

        // Assert
        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingDataElementsResponse = okResult.Value as SigningDataElementsResponse;
        Assert.NotNull(signingDataElementsResponse);

        // Should return an empty list since no data elements match DataTypesToSign
        Assert.Empty(signingDataElementsResponse.DataElements);
    }

    [Fact]
    public async Task GetSigneesState_WithTaskId_UsesOverriddenTask()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup instance with current task as a data task
        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(
                new Instance
                {
                    InstanceOwner = new InstanceOwner { PartyId = "1337" },
                    Process = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "data" },
                    },
                }
            );

        // Setup multiple tasks - current task is a data task, but we'll override to a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        var altinnTaskExtensionTask2 = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration
            {
                DataTypesToSign = ["overriddenDataType"],
                SignatureDataType = "overriddenSignatureDataType",
                SigneeProviderId = "overriddenSigneeProviderId",
                SigneeStatesDataTypeId = "overriddenSigneeStatesDataTypeId",
                SigningPdfDataType = "overriddenSigningPdfDataType",
                CorrespondenceResources = [],
                RunDefaultValidator = true,
            },
        };

        _processReaderMock.Setup(s => s.GetAltinnTaskExtension("task2")).Returns(altinnTaskExtensionTask2);

        List<SigneeContext> signeeContexts =
        [
            new SigneeContext
            {
                TaskId = "task2",
                Signee = new PersonSignee
                {
                    FullName = "person1",
                    SocialSecurityNumber = "123456789",
                    Party = new Party { PartyId = 1 },
                },
                SigneeState = new SigneeContextState
                {
                    DelegationFailedReason = null,
                    IsAccessDelegated = true,
                    HasBeenMessagedForCallToSign = false,
                    CallToSignFailedReason = null,
                },
                SignDocument = null,
            },
        ];

        _signingServiceMock
            .Setup(s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    altinnTaskExtensionTask2.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var actionResult = await controller.GetSigneesState(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "task2"
        );

        // Assert
        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingStateResponse = okResult.Value as SigningStateResponse;
        Assert.NotNull(signingStateResponse);
        Assert.Single(signingStateResponse.SigneeStates);

        // Verify that GetSigneeContexts was called with the override task id
        _signingServiceMock.Verify(
            s =>
                s.GetSigneeContexts(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    altinnTaskExtensionTask2.SignatureConfiguration!,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetSigneesState_WithTaskId_NonSigningTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup multiple tasks - task2 is not a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetSigneesState(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "task2"
        );

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetSigneesState_WithTaskId_NonExistentTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup single task - taskId will point to a non-existent task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetSigneesState(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "nonExistentTask"
        );

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_WithTaskId_UsesOverriddenTask()
    {
        // Arrange
        SetupAuthenticationContextMock(authenticated: CreateAuthenticatedUser());
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup instance with current task as a data task
        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(
                new Instance
                {
                    InstanceOwner = new InstanceOwner { PartyId = "1337" },
                    Process = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "data" },
                    },
                }
            );

        // Setup multiple tasks - current task is a data task, but we'll override to a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        var altinnTaskExtensionTask2 = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration
            {
                DataTypesToSign = ["overriddenDataType"],
                SignatureDataType = "overriddenSignatureDataType",
                SigneeProviderId = "overriddenSigneeProviderId",
                SigneeStatesDataTypeId = "overriddenSigneeStatesDataTypeId",
                SigningPdfDataType = "overriddenSigningPdfDataType",
                CorrespondenceResources = [],
                RunDefaultValidator = true,
            },
        };

        _processReaderMock.Setup(s => s.GetAltinnTaskExtension("task2")).Returns(altinnTaskExtensionTask2);

        List<OrganizationSignee> organisationSignees =
        [
            new OrganizationSignee
            {
                OrgName = "org1",
                OrgNumber = "123456789",
                OrgParty = new Party { PartyId = 1 },
            },
        ];

        _signingServiceMock
            .Setup(s =>
                s.GetAuthorizedOrganizationSignees(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    altinnTaskExtensionTask2.SignatureConfiguration!,
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(organisationSignees);

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "task2"
        );

        // Assert
        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var response = okResult.Value as SigningAuthorizedOrganizationsResponse;
        Assert.NotNull(response);
        Assert.Single(response.Organizations);

        // Verify that GetAuthorizedOrganizationSignees was called with the overridden configuration
        _signingServiceMock.Verify(
            s =>
                s.GetAuthorizedOrganizationSignees(
                    It.IsAny<InstanceDataUnitOfWork>(),
                    altinnTaskExtensionTask2.SignatureConfiguration!,
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_WithTaskId_NonSigningTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock(authenticated: CreateAuthenticatedUser());
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup multiple tasks - task2 is not a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "task2"
        );

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
    }

    [Fact]
    public async Task GetAuthorizedOrganizations_WithTaskId_NonExistentTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock(authenticated: CreateAuthenticatedUser());
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup single task - taskId will point to a non-existent task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetAuthorizedOrganizations(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            CancellationToken.None,
            taskId: "nonExistentTask"
        );

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetDataElements_WithTaskId_UsesOverriddenTask()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup controller context with request
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("localhost");
        request.Path = "/tdd/app/instances/1337/guid/signing/data-elements";

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var now = DateTime.UtcNow;

        // Setup instance with current task as a data task
        var instance = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "task1", AltinnTaskType = "data" },
            },
            Data =
            [
                new DataElement
                {
                    Id = "dataElement1",
                    DataType = "overriddenDataType", // This matches the overridden task's DataTypesToSign
                    ContentType = "application/json",
                    Size = 100,
                    Filename = "file1.json",
                    Created = now,
                },
                new DataElement
                {
                    Id = "dataElement2",
                    DataType = "dataTypeToSign1", // This matches the default task's DataTypesToSign, not the override
                    ContentType = "application/json",
                    Size = 200,
                    Filename = "file2.json",
                    Created = now,
                },
            ],
        };

        _instanceClientMock
            .Setup(x => x.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);

        // Setup multiple tasks - current task is a data task, but we'll override to a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        var altinnTaskExtensionTask2 = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration
            {
                DataTypesToSign = ["overriddenDataType"],
                SignatureDataType = "overriddenSignatureDataType",
                SigneeProviderId = "overriddenSigneeProviderId",
                SigneeStatesDataTypeId = "overriddenSigneeStatesDataTypeId",
                SigningPdfDataType = "overriddenSigningPdfDataType",
                CorrespondenceResources = [],
                RunDefaultValidator = true,
            },
        };

        _processReaderMock.Setup(s => s.GetAltinnTaskExtension("task2")).Returns(altinnTaskExtensionTask2);

        // Act
        var actionResult = await controller.GetDataElements("tdd", "app", 1337, Guid.NewGuid(), taskId: "task2");

        // Assert
        var okResult = actionResult as OkObjectResult;
        Assert.NotNull(okResult);

        var signingDataElementsResponse = okResult.Value as SigningDataElementsResponse;
        Assert.NotNull(signingDataElementsResponse);

        // Should only include data elements that match the overridden task's DataTypesToSign
        Assert.Single(signingDataElementsResponse.DataElements);
        Assert.Equal("dataElement1", signingDataElementsResponse.DataElements[0].Id);
        Assert.DoesNotContain(signingDataElementsResponse.DataElements, de => de.Id == "dataElement2");
    }

    [Fact]
    public async Task GetDataElements_WithTaskId_NonSigningTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup controller context with request
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("localhost");
        request.Path = "/tdd/app/instances/1337/guid/signing/data-elements";

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Setup multiple tasks - task2 is not a signing task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
                new ProcessTask
                {
                    Id = "task2",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "data" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetDataElements("tdd", "app", 1337, Guid.NewGuid(), taskId: "task2");

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetDataElements_WithTaskId_NonExistentTask_Returns_BadRequest()
    {
        // Arrange
        SetupAuthenticationContextMock();
        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<SigningController>();

        // Setup controller context with request
        var httpContext = new DefaultHttpContext();
        var request = httpContext.Request;
        request.Scheme = "https";
        request.Host = new HostString("localhost");
        request.Path = "/tdd/app/instances/1337/guid/signing/data-elements";

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Setup single task - taskId will point to a non-existent task
        _processReaderMock
            .Setup(s => s.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "task1",
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension() { TaskType = "signing" },
                    },
                },
            ]);

        // Act
        var actionResult = await controller.GetDataElements(
            "tdd",
            "app",
            1337,
            Guid.NewGuid(),
            taskId: "nonExistentTask"
        );

        // Assert
        var badRequestResult = actionResult as BadRequestObjectResult;
        Assert.NotNull(badRequestResult);

        var problemDetails = badRequestResult.Value as ProblemDetails;
        Assert.NotNull(problemDetails);
        Assert.Equal("Not a signing task", problemDetails.Title);
        Assert.Equal(
            "This endpoint is only callable while the current task is a signing task, or when taskId query param is set to a signing task's ID.",
            problemDetails.Detail
        );
    }

    private void SetupAuthenticationContextMock(Authenticated? authenticated = null)
    {
        var authenticationContextMock = new Mock<IAuthenticationContext>();

        authenticationContextMock.Setup(ac => ac.Current).Returns(authenticated ?? CreateAuthenticatedNone());

        _serviceCollection.AddTransient(_ => authenticationContextMock.Object);
    }

    private Authenticated.None CreateAuthenticatedNone()
    {
        var parseContext = default(Authenticated.ParseContext);
        return new Authenticated.None(ref parseContext);
    }

    private Authenticated.User CreateAuthenticatedUser(int userId = 1337)
    {
        var parseContext = default(Authenticated.ParseContext);
        return new Authenticated.User(
            userId: userId,
            username: "Username",
            userPartyId: 12345,
            authenticationLevel: 2,
            authenticationMethod: "test",
            selectedPartyId: 2,
            context: ref parseContext
        );
    }
}
