using System.Reflection;
using System.Xml;
using System.Xml.Schema;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.Factories;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivDefaultPayloadGeneratorTest
{
    //Example Instance ID = "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90"

    private static readonly XsdValidator _xsdValidator = new();
    private static readonly Guid _fiksIOSenderAccount = Guid.Parse("f41af07b-47c3-4d3a-9a34-1baa0f575101");
    private static readonly DateTimeOffset _now = DateTimeOffset.Parse("2025-10-24T09:58:00.000000Z");

    private static readonly Instance _defaultInstance = Factories.Instance(
        "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90",
        [
            Factories.DataElement("model", null, "application/xml"),
            Factories.DataElement("ref-data-as-pdf", null, "application/pdf"),
            Factories.DataElement("something-uploaded", "receipt2.pdf", null),
            Factories.DataElement("something-uploaded", "letter.docx", null),
            Factories.DataElement("something-uploaded", "drawing_1a.jpg", null),
        ]
    );

    private static class Auth
    {
        public static readonly Authenticated User = TestAuthentication.GetUserAuthentication();
        public static readonly Authenticated SystemUser = TestAuthentication.GetSystemUserAuthentication();
        public static readonly Authenticated ServiceOwner = TestAuthentication.GetServiceOwnerAuthentication();
        public static readonly Authenticated Org = TestAuthentication.GetOrgAuthentication();
    }

    public static IEnumerable<object[]> TestCases =>
        [
            TestCase.Create(
                testIdentifier: "1",
                fiksArkivMessageType: FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                expectedAttachmentFilenames: ["model.xml", "ref-data-as-pdf.pdf"],
                primaryDocumentSettings: Factories.DocumentSettings("model"),
                attachmentSettings: [Factories.DocumentSettings("ref-data-as-pdf")],
                archiveDocumentMetadata: null,
                recipientParty: Factories.RecipientParty("recipient-id", "Recipient Name"),
                serviceOwnerParty: Factories.ServiceOwnerParty("org-number", "Org Name"),
                instanceOwnerParty: null,
                instanceOwnerClassification: Factories.InstanceOwnerClassification(Auth.User)
            ),
            TestCase.Create(
                testIdentifier: "2",
                fiksArkivMessageType: FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                expectedAttachmentFilenames: ["Form.xml", "Form.pdf", "receipt2.pdf", "letter.docx", "drawing_1a.jpg"],
                primaryDocumentSettings: Factories.DocumentSettings("model", "Form.xml"),
                attachmentSettings:
                [
                    Factories.DocumentSettings("ref-data-as-pdf", "Form.pdf"),
                    Factories.DocumentSettings("something-uploaded"),
                ],
                archiveDocumentMetadata: Factories.Metadata(
                    "custom-system-id",
                    "custom-rule-id",
                    "custom-case-file-id",
                    "Custom Case File Title",
                    "Custom Journal Entry Title"
                ),
                recipientParty: Factories.RecipientParty("recipient-id", "Recipient Name"),
                serviceOwnerParty: Factories.ServiceOwnerParty("org-number", "Org Name"),
                instanceOwnerParty: null,
                instanceOwnerClassification: Factories.InstanceOwnerClassification(Auth.SystemUser)
            ),
            TestCase.Create(
                testIdentifier: "3",
                fiksArkivMessageType: FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                expectedAttachmentFilenames: ["Form.xml"],
                primaryDocumentSettings: Factories.DocumentSettings("model", "Form.xml"),
                attachmentSettings: [Factories.DocumentSettings("doesnt-exist")],
                archiveDocumentMetadata: null,
                recipientParty: Factories.RecipientParty("recipient-id", "Recipient Name", "123456789", "Ref-001"),
                serviceOwnerParty: Factories.ServiceOwnerParty("org-number", "Org Name"),
                instanceOwnerParty: Factories.InstanceOwnerOwnerParty(
                    "altinn-party-id",
                    "Instance Owner Person Name",
                    "national-id-no",
                    null,
                    "phone-no",
                    "mobile-no",
                    "Street 1",
                    "0123",
                    "City"
                ),
                instanceOwnerClassification: Factories.InstanceOwnerClassification(Auth.ServiceOwner)
            ),
            TestCase.Create(
                testIdentifier: "4",
                fiksArkivMessageType: FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                expectedAttachmentFilenames: ["Form.xml"],
                primaryDocumentSettings: Factories.DocumentSettings("model", "Form.xml"),
                attachmentSettings: null,
                archiveDocumentMetadata: Factories.Metadata(
                    systemId: "custom-system-id",
                    caseFileTitle: "Custom Case File Title",
                    journalEntryTitle: "Custom Journal Entry Title",
                    ruleId: null,
                    caseFileId: null
                ),
                recipientParty: Factories.RecipientParty("recipient-id", "Recipient Name"),
                serviceOwnerParty: Factories.ServiceOwnerParty("org-number", "Org Name"),
                instanceOwnerParty: Factories.InstanceOwnerOwnerParty(
                    "altinn-party-id",
                    "Instance Owner Org Name",
                    null,
                    "org-number",
                    "duplicate-phone-no",
                    "duplicate-mobile-no",
                    "Street 1",
                    null,
                    "City"
                ),
                instanceOwnerClassification: Factories.InstanceOwnerClassification(Auth.Org)
            ),
        ];

    [Theory]
    [MemberData(nameof(TestCases))]
    internal async Task GeneratePayload_GeneratesCorrectPayload(TestCase testCase)
    {
        // Arrange
        var fixture = testCase.Fixture;

        // Act
        var result = await fixture.GeneratePayload(
            _defaultInstance,
            FiksArkivConstants.MessageTypes.CreateArchiveRecord
        );

        // Assert
        Assert.NotNull(result);

        var attachments = result.Where(x => x.Filename != FiksArkivConstants.Filenames.ArchiveRecord).ToList();
        Assert.Equivalent(attachments.Select(x => x.Filename), testCase.ExpectedAttachmentFilenames);

        var archiveMessage = result.Single(x => x.Filename == FiksArkivConstants.Filenames.ArchiveRecord);
        var archiveMessageXml = archiveMessage.Data.ReadToString();
        await Verify(archiveMessageXml).UseDefaultSettings(testCase.TestIdentifier);

        var validationResult = _xsdValidator.Validate(archiveMessageXml);
        Assert.Empty(validationResult.Errors);
        Assert.Empty(validationResult.Warnings);
    }

    [Fact]
    public async Task GeneratePayload_ThrowsException_ForUnsupportedMessageType()
    {
        var fixture = PayloadGeneratorFixture.Create(null!, null!, null, null!, null!, null, null!, null!);

        var ex = await Assert.ThrowsAsync<FiksArkivException>(() =>
            fixture.GeneratePayload(Factories.Instance(null!, []), "non-create-type")
        );

        Assert.Contains("Unsupported message type", ex.Message);
    }

    internal sealed record TestCase(
        PayloadGeneratorFixture Fixture,
        string MessageType,
        IEnumerable<string> ExpectedAttachmentFilenames,
        string TestIdentifier
    )
    {
        public static TestCase Create(
            string testIdentifier,
            string fiksArkivMessageType,
            IEnumerable<string> expectedAttachmentFilenames,
            FiksArkivDataTypeSettings primaryDocumentSettings,
            IReadOnlyList<FiksArkivDataTypeSettings>? attachmentSettings,
            FiksArkivDocumentMetadata? archiveDocumentMetadata,
            Korrespondansepart recipientParty,
            Korrespondansepart serviceOwnerParty,
            Korrespondansepart? instanceOwnerParty,
            Klassifikasjon instanceOwnerClassification,
            string applicationTitle = "Test app",
            string appId = "ttd/test-app"
        )
        {
            return new TestCase(
                PayloadGeneratorFixture.Create(
                    primaryDocumentSettings,
                    attachmentSettings,
                    archiveDocumentMetadata,
                    recipientParty,
                    serviceOwnerParty,
                    instanceOwnerParty,
                    instanceOwnerClassification,
                    applicationTitle,
                    appId
                ),
                fiksArkivMessageType,
                expectedAttachmentFilenames,
                testIdentifier
            );
        }

        public override string ToString() => TestIdentifier;

        public static implicit operator object[](TestCase testCase) => [testCase];
    }

    internal sealed record PayloadGeneratorFixture(
        FiksArkivDefaultPayloadGenerator FiksArkivDefaultPayloadGenerator,
        Mock<IAppMetadata> AppMetadataMock,
        Mock<IDataClient> DataClientMock,
        Mock<IFiksArkivConfigResolver> ConfigResolverMock,
        FakeTimeProvider FakeTime,
        Mock<ILogger<FiksArkivDefaultPayloadGenerator>> LoggerMock
    )
    {
        public async Task<IReadOnlyList<FiksIOMessagePayload>> GeneratePayload(Instance instance, string messageType)
        {
            var payload = await FiksArkivDefaultPayloadGenerator.GeneratePayload(
                "",
                instance,
                Factories.Recipient(),
                messageType
            );
            return payload.ToList();
        }

        public static PayloadGeneratorFixture Create(
            FiksArkivDataTypeSettings primaryDocumentSettings,
            IReadOnlyList<FiksArkivDataTypeSettings>? attachmentSettings,
            FiksArkivDocumentMetadata? archiveDocumentMetadata,
            Korrespondansepart recipientParty,
            Korrespondansepart serviceOwnerParty,
            Korrespondansepart? instanceOwnerParty,
            Klassifikasjon instanceOwnerClassification,
            string applicationTitle = "Test app",
            string appId = "ttd/test-app"
        )
        {
            var appMetadataMock = new Mock<IAppMetadata>();
            var dataClientMock = new Mock<IDataClient>();
            var configResolverMock = new Mock<IFiksArkivConfigResolver>();
            var loggerMock = new Mock<ILogger<FiksArkivDefaultPayloadGenerator>>();
            var fakeTime = new FakeTimeProvider(_now);

            appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata(appId));

            configResolverMock.SetupGet(x => x.PrimaryDocumentSettings).Returns(primaryDocumentSettings);
            configResolverMock.SetupGet(x => x.AttachmentSettings).Returns(attachmentSettings ?? []);
            configResolverMock
                .Setup(x => x.GetApplicationTitle(It.IsAny<CancellationToken>()))
                .ReturnsAsync(applicationTitle);
            configResolverMock
                .Setup(x => x.GetArchiveDocumentMetadata(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(archiveDocumentMetadata);
            configResolverMock
                .Setup(x => x.GetCorrelationId(It.IsAny<Instance>()))
                .Returns("https://hostname/org/app/instances/instance-owner/instance-id");
            configResolverMock
                .Setup(x => x.GetRecipientParty(It.IsAny<Instance>(), It.IsAny<FiksArkivRecipient>()))
                .Returns(recipientParty);
            configResolverMock
                .Setup(x => x.GetServiceOwnerParty(It.IsAny<CancellationToken>()))
                .ReturnsAsync(serviceOwnerParty);
            configResolverMock
                .Setup(x => x.GetInstanceOwnerParty(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(instanceOwnerParty);
            configResolverMock
                .Setup(x => x.GetInstanceOwnerClassification(It.IsAny<Authenticated>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(instanceOwnerClassification);

            var payloadGenerator = new FiksArkivDefaultPayloadGenerator(
                appMetadataMock.Object,
                dataClientMock.Object,
                Mock.Of<IAuthenticationContext>(),
                loggerMock.Object,
                Mock.Of<IHostEnvironment>(x => x.EnvironmentName == Environments.Development),
                configResolverMock.Object,
                Options.Create(Factories.FiksIOSettings(_fiksIOSenderAccount)),
                fakeTime
            );

            dataClientMock
                .Setup(x =>
                    x.GetDataBytes(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync("Mocked content"u8.ToArray());

            return new PayloadGeneratorFixture(
                payloadGenerator,
                appMetadataMock,
                dataClientMock,
                configResolverMock,
                fakeTime,
                loggerMock
            );
        }
    }

    private static class Factories
    {
        public static FiksIOSettings FiksIOSettings(Guid accountId) =>
            new()
            {
                AccountId = accountId,
                IntegrationId = Guid.Empty,
                IntegrationPassword = "-",
                AccountPrivateKeyBase64 = "-",
            };

        public static Instance Instance(string id, IEnumerable<DataElement> dataElements) =>
            new() { Id = id, Data = [.. dataElements] };

        public static FiksArkivRecipient Recipient() => new(Guid.NewGuid(), "-", "-", "-");

        public static FiksArkivDataTypeSettings DocumentSettings(string dataType, string? filename = null) =>
            new() { DataType = dataType, Filename = filename };

        public static FiksArkivDocumentMetadata Metadata(
            string? systemId,
            string? ruleId,
            string? caseFileId,
            string? caseFileTitle,
            string? journalEntryTitle
        ) => new(systemId, ruleId, caseFileId, caseFileTitle, journalEntryTitle);

        public static Korrespondansepart RecipientParty(
            string id,
            string name,
            string? orgNumber = null,
            string? reference = null
        ) => KorrespondansepartFactory.CreateRecipient(id, name, orgNumber, reference);

        public static Korrespondansepart ServiceOwnerParty(string id, string name) =>
            KorrespondansepartFactory.CreateSender(id, name);

        public static Korrespondansepart InstanceOwnerOwnerParty(
            string id,
            string name,
            string? personId,
            string? orgNumber,
            string? phoneNumber,
            string? mobileNumber,
            string? address,
            string? postcode,
            string? city
        )
        {
            var party = KorrespondansepartFactory.CreateSender(id, name, personId, orgNumber);
            party.AddContactInfo(phoneNumber, mobileNumber, address, postcode, city);

            return party;
        }

        public static Klassifikasjon InstanceOwnerClassification(Authenticated auth) =>
            auth switch
            {
                Authenticated.User user => KlassifikasjonFactory.CreateUser(user).GetAwaiter().GetResult(),
                Authenticated.SystemUser systemUser => KlassifikasjonFactory.CreateSystemUser(systemUser),
                Authenticated.ServiceOwner serviceOwner => KlassifikasjonFactory.CreateServiceOwner(serviceOwner),
                Authenticated.Org org => KlassifikasjonFactory.CreateOrganization(org),
                _ => throw new FiksArkivException(
                    $"Could not determine submitter details from authentication context: {auth}"
                ),
            };

        public static DataElement DataElement(string dataType, string? filename, string? contentType) =>
            new()
            {
                Id = Guid.NewGuid().ToString(),
                DataType = dataType,
                Filename = filename,
                ContentType = contentType,
            };
    }
}
