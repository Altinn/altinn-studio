using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Signing;

public class SigningReceiptServiceTests(ITestOutputHelper output)
{
    SigningReceiptService SetupService(
        Mock<ICorrespondenceClient>? correspondenceClientMockOverride = null,
        Mock<IHostEnvironment>? hostEnvironmentMockOverride = null,
        Mock<IDataClient>? dataClientMockOverride = null,
        Mock<IAltinnCdnClient>? altinnCdnClientMockOverride = null,
        Mock<IAppMetadata>? appMetadataMockOverride = null,
        ITranslationService? translationServiceOverride = null
    )
    {
        Mock<ICorrespondenceClient> correspondenceClientMock = correspondenceClientMockOverride ?? new();
        Mock<IHostEnvironment> hostEnvironmentMock = hostEnvironmentMockOverride ?? new();
        Mock<IDataClient>? dataClientMock = dataClientMockOverride ?? new();
        Mock<IAppMetadata> appMetadataMock = appMetadataMockOverride ?? new();
        Mock<IAltinnCdnClient> altinnCdnClientMock = altinnCdnClientMockOverride ?? new();
        Mock<ITranslationService> translationServiceMock = new();
        return new SigningReceiptService(
            correspondenceClientMock.Object,
            dataClientMock.Object,
            hostEnvironmentMock.Object,
            altinnCdnClientMock.Object,
            appMetadataMock.Object,
            translationServiceOverride ?? translationServiceMock.Object,
            FakeLoggerXunit.Get<SigningReceiptService>(output)
        );
    }

    Mock<IAppResources> SetupAppResourcesMock(
        TextResource? textResourceOverride = null,
        List<TextResourceElement>? additionalTextResourceElements = null
    )
    {
        Mock<IAppResources> appResourcesMock = new();
        TextResource textResource =
            textResourceOverride ?? new TextResource { Resources = additionalTextResourceElements ?? [] };
        textResource.Resources.AddRange(additionalTextResourceElements ?? []);
        appResourcesMock
            .Setup(m => m.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(textResource);
        return appResourcesMock;
    }

    [Fact]
    public async Task SendSignatureReceipt_CallsCorrespondenceClientWithCorrectParameters()
    {
        // Arrange
        SendCorrespondencePayload? capturedPayload = null;
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        correspondenceClientMock
            .Setup(m => m.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Callback<SendCorrespondencePayload, CancellationToken>((payload, token) => capturedPayload = payload);

        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");

        var orgs = new Dictionary<string, AltinnCdnOrgDetails>
        {
            {
                "brg",
                new AltinnCdnOrgDetails
                {
                    Name = new AltinnCdnOrgName { Nb = "Brønnøysundregistrene" },
                    Orgnr = "974760673",
                    Environments = ["tt02"],
                }
            },
        };

        AltinnCdnOrgs altinnCdnOrgs = new() { Orgs = orgs };
        Mock<IAltinnCdnClient> altinnCdnClientMock = new();
        altinnCdnClientMock
            .Setup(x => x.GetOrgs(It.IsAny<CancellationToken>()))
            .Returns(Task.FromResult(altinnCdnOrgs));

        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
            Org = "brg",
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        DataElement signedElement = new()
        {
            Id = "11111111-1111-1111-1111-111111111111",
            Filename = "signed.pdf",
            ContentType = "application/pdf",
            DataType = "someType",
        };

        DataElement unsignedElement = new()
        {
            Id = "22222222-2222-2222-2222-222222222222",
            Filename = "unsigned.pdf",
            ContentType = "application/pdf",
            DataType = "someType",
        };

        Instance instance = new() { Id = "org/app", Data = [signedElement, unsignedElement] };
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));

        Mock<IInstanceDataMutator> instanceDataMutatorMock = new();
        instanceDataMutatorMock.Setup(x => x.Instance).Returns(instance);
        UserActionContext context = new(instanceDataMutatorMock.Object, 123456);

        var dataClientMock = new Mock<IDataClient>();
        dataClientMock
            .Setup(x =>
                x.GetDataBytes(
                    It.Is<int>(party => party == instanceIdentifier.InstanceOwnerPartyId),
                    It.Is<Guid>(guid => guid == instanceIdentifier.InstanceGuid),
                    It.Is<Guid>(id => id == Guid.Parse(signedElement.Id)),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([1, 2, 3]);

        SigningReceiptService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            altinnCdnClientMockOverride: altinnCdnClientMock,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock,
            dataClientMockOverride: dataClientMock
        );

        Core.Internal.Sign.Signee signee = new()
        {
            UserId = 123.ToString(),
            SystemUserId = null,
            PersonNumber = "11854995997",
            OrganisationNumber = null,
        };

        List<DataElementSignature> dataElementSignatures =
        [
            new DataElementSignature("11111111-1111-1111-1111-111111111111"),
        ];

        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new AltinnEnvironmentConfig { Environment = "tt02", Value = "app_ttd_receipt" },
        ];

        // Act
        await service.SendSignatureReceipt(
            instanceIdentifier,
            signee,
            dataElementSignatures,
            context,
            correspondenceResources,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedPayload);
        Assert.Equal("app_ttd_receipt", capturedPayload!.CorrespondenceRequest.ResourceId);
        Assert.Equal(
            "123/ab0cdeb5-dc5e-4faa-966b-d18bb932ca07",
            capturedPayload.CorrespondenceRequest.SendersReference
        );
        Assert.Equal("974760673", capturedPayload.CorrespondenceRequest.Sender.ToString());
        Assert.IsType<OrganisationOrPersonIdentifier.Person>(capturedPayload.CorrespondenceRequest.Recipients[0]);
        Assert.Equal(
            "11854995997",
            (
                capturedPayload.CorrespondenceRequest.Recipients[0] as OrganisationOrPersonIdentifier.Person
            )!.Value.ToString()
        );
        Assert.Equal("TestAppName: Signeringen er bekreftet", capturedPayload.CorrespondenceRequest.Content.Title);
        Assert.Equal("Du har signert for TestAppName.", capturedPayload.CorrespondenceRequest.Content.Summary);
        Assert.Equal(
            "Dokumentene du har signert er vedlagt. Disse kan lastes ned om ønskelig. <br /><br />Hvis du lurer på noe, kan du kontakte Brønnøysundregistrene.",
            capturedPayload.CorrespondenceRequest.Content.Body
        );
    }

    [Fact]
    public async Task GetCorrespondenceHeaders_NoResource_ThrowsConfigurationException()
    {
        // Arrange
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
            Org = "brg",
        };

        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");

        SigningReceiptService service = SetupService(hostEnvironmentMockOverride: hostEnvironmentMock);

        var recipientNin = "11854995997";

        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            // No resource configured for the environment
        ];

        // Act & Assert
        await Assert.ThrowsAsync<ConfigurationException>(() =>
            service.GetCorrespondenceHeaders(
                recipientNin,
                applicationMetadata,
                correspondenceResources,
                CancellationToken.None
            )
        );
    }

    [Fact]
    public async Task GetCorrespondenceHeaders_RecipientNinIsNull_ThrowsInvalidOperationException()
    {
        // Arrange
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
            Org = "brg",
        };

        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");

        SigningReceiptService service = SetupService(hostEnvironmentMockOverride: hostEnvironmentMock);

        string? recipientNin = null;

        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new AltinnEnvironmentConfig { Environment = "tt02", Value = "app_ttd_receipt" },
        ];

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetCorrespondenceHeaders(
                recipientNin,
                applicationMetadata,
                correspondenceResources,
                CancellationToken.None
            )
        );
    }

    [Fact]
    public async Task GetContent_WithCustomTexts_ReturnsCustomContent()
    {
        // Arrange
        List<TextResourceElement> textResourceElements =
        [
            new TextResourceElement { Id = "signing.correspondence_receipt_title", Value = "Custom receipt title" },
            new TextResourceElement { Id = "signing.correspondence_receipt_summary", Value = "Custom receipt summary" },
            new TextResourceElement { Id = "signing.correspondence_receipt_body", Value = "Custom receipt body" },
            new TextResourceElement { Id = "appName", Value = "Custom app name" },
        ];

        // Setup IAppResources mock to return the custom text resource.
        Mock<IAppResources> appResourcesMock = SetupAppResourcesMock(
            additionalTextResourceElements: textResourceElements
        );

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output)
        );

        var service = SetupService(translationServiceOverride: translationService);

        Instance instance = new() { AppId = "org/app" };

        Mock<IInstanceDataMutator> instanceDataMutatorMock = new();
        instanceDataMutatorMock.Setup(x => x.Instance).Returns(instance);
        UserActionContext context = new(instanceDataMutatorMock.Object, 123456);

        // Setup ApplicationMetadata with a fallback title.
        ApplicationMetadata appMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "Fallback App Name" } },
        };

        AltinnCdnOrgDetails senderDetails = new()
        {
            Name = new AltinnCdnOrgName
            {
                Nb = "Sender NB",
                Nn = "Sender NN",
                En = "Sender EN",
            },
        };

        // Act
        CorrespondenceContent result = await service.GetContent(context, appMetadata, senderDetails);

        // Assert
        Assert.Equal("Custom receipt title", result.Title);
        Assert.Equal("Custom receipt summary", result.Summary);
        Assert.Equal("Custom receipt body", result.Body);
        Assert.Equal(LanguageCode<Iso6391>.Parse(LanguageConst.Nb), result.Language);
    }

    [Fact]
    public async Task GetContent_GetTextsThrows_UsesDefaultTexts()
    {
        // Arrange
        // Configure the IAppResources mock to throw an exception.
        var appResourcesMock = new Mock<IAppResources>();
        appResourcesMock
            .Setup(r => r.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Test exception"));

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output)
        );

        var service = SetupService(translationServiceOverride: translationService);

        Instance instance = new() { Id = "org/app" };

        Mock<IInstanceDataMutator> instanceDataMutatorMock = new();
        instanceDataMutatorMock.Setup(x => x.Instance).Returns(instance);
        UserActionContext context = new(instanceDataMutatorMock.Object, 123456);

        ApplicationMetadata appMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "Fallback App Name" } },
        };

        AltinnCdnOrgDetails senderDetails = new()
        {
            Name = new AltinnCdnOrgName
            {
                Nb = "Sender NB",
                Nn = "Sender NN",
                En = "Sender EN",
            },
        };

        // Act
        CorrespondenceContent result = await service.GetContent(context, appMetadata, senderDetails);

        // Assert
        Assert.Contains("Signeringen er bekreftet", result.Title);
        Assert.Contains("Du har signert for", result.Summary);
        Assert.Contains("Dokumentene du har signert er vedlagt", result.Body);
        Assert.Equal(LanguageCode<Iso6391>.Parse(LanguageConst.Nb), result.Language);
    }

    [Fact]
    public async Task GetCorrespondenceAttachments_ReturnsCorrectAttachments()
    {
        // Arrange
        InstanceIdentifier instanceIdentifier = new(123456, Guid.NewGuid());

        // Create two data elements; only one will have a corresponding signature.
        DataElement signedElement = new()
        {
            Id = "11111111-1111-1111-1111-111111111111",
            Filename = "signed.pdf",
            ContentType = "application/pdf",
            DataType = "someType",
        };

        DataElement unsignedElement = new()
        {
            Id = "22222222-2222-2222-2222-222222222222",
            Filename = "unsigned.pdf",
            ContentType = "application/pdf",
            DataType = "someType",
        };

        Instance instance = new() { Data = [signedElement, unsignedElement] };

        Mock<IInstanceDataMutator> instanceDataMutatorMock = new();
        instanceDataMutatorMock.Setup(x => x.Instance).Returns(instance);
        UserActionContext context = new(instanceDataMutatorMock.Object, 123456);
        IEnumerable<DataElementSignature> dataElementSignatures = [new DataElementSignature(signedElement.Id)];

        ApplicationMetadata appMetadata = new("org/app");

        var dataClientMock = new Mock<IDataClient>();
        dataClientMock
            .Setup(x =>
                x.GetDataBytes(
                    It.Is<int>(party => party == instanceIdentifier.InstanceOwnerPartyId),
                    It.Is<Guid>(guid => guid == instanceIdentifier.InstanceGuid),
                    It.Is<Guid>(id => id == Guid.Parse(signedElement.Id)),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([1, 2, 3]);

        // Act
        IEnumerable<CorrespondenceAttachment> attachments = await SigningReceiptService.GetCorrespondenceAttachments(
            instanceIdentifier,
            dataElementSignatures,
            appMetadata,
            context,
            dataClientMock.Object
        );

        // Assert
        Assert.Single(attachments);
        CorrespondenceAttachment attachment = attachments.First();
        Assert.Equal("signed.pdf", attachment.Filename);
        Assert.Equal(signedElement.Id, attachment.SendersReference);
        Assert.Equal(new byte[] { 1, 2, 3 }, attachment.Data);
    }

    [Fact]
    public void GetDataElementFilename_DataElementHasFileName_ReturnsCorrectFilename()
    {
        // Arrange
        DataElement dataElement = new() { Filename = "filename" };
        ApplicationMetadata applicationMetadata = new("org/app");

        // Act
        string result = SigningReceiptService.GetDataElementFilename(dataElement, applicationMetadata);

        // Assert
        Assert.Equal("filename", result);
    }

    [Fact]
    public void GetDataElementFilename_NoFileNameNoApplogic_ReturnsConstructedFilename()
    {
        // Arrange
        DataElement dataElement = new()
        {
            // No filename set
            DataType = "typeToMatch",
            ContentType = "application/pdf",
        };
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "typeToMatch",
                    Description = new LanguageString { { LanguageConst.En, "description" } },
                },
            ],
        };

        // Act
        string result = SigningReceiptService.GetDataElementFilename(dataElement, applicationMetadata);

        // Assert
        Assert.Equal("typeToMatch.pdf", result);
    }

    [Fact]
    public void GetDataElementFilename_NoFileName_HasApplogic_ReturnsConstructedFilename()
    {
        // Arrange
        DataElement dataElement = new()
        {
            // No filename set
            DataType = "typeToMatch",
            ContentType = "application/xml",
        };
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "typeToMatch",
                    Description = new LanguageString { { LanguageConst.En, "description" } },
                    AppLogic = new ApplicationLogic { AutoCreate = true },
                },
            ],
        };

        // Act
        string result = SigningReceiptService.GetDataElementFilename(dataElement, applicationMetadata);

        // Assert
        Assert.Equal("skjemadata_typeToMatch.xml", result);
    }

    [Theory]
    [InlineData("The signed documents are attached.", LanguageConst.En)]
    [InlineData("Dokumenta du har signert er vedlagde.", LanguageConst.Nn)]
    [InlineData("Dokumentene du har signert er vedlagt.", LanguageConst.Nb)]
    [InlineData("Dokumentene du har signert er vedlagt.", "NotALanguage")]
    public void GetDefaultTexts_ReturnsCorrectTexts(string expectedBodyContains, string language)
    {
        // Arrange
        string appName = "appName";
        string appOwner = "appOwner";

        // Act
        DefaultTexts result = SigningReceiptService.GetDefaultTexts(language, appName, appOwner);

        // Assert
        Assert.Contains(expectedBodyContains, result.Body);
    }
}
