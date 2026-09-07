using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivDefaultPayloadGeneratorTest
{
    //Example Instance ID = "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90"

    private static readonly XsdValidator _xsdValidator = new();
    private static readonly DateTimeOffset _now = DateTimeOffset.Parse("2025-10-24T09:58:00.000000Z");

    // Built fresh per test invocation because the production code mutates DataElement.Filename;
    // reusing a static instance leaks state across test cases.
    private static Instance NewDefaultInstance() =>
        new()
        {
            Id = "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "12345" },
            Data =
            [
                Factories.DataElement("model", null, "application/xml"),
                Factories.DataElement("ref-data-as-pdf", null, "application/pdf"),
                Factories.DataElement("something-uploaded", "receipt2.pdf", null),
                Factories.DataElement("something-uploaded", "letter.docx", null),
                Factories.DataElement("something-uploaded", "drawing_1a.jpg", null),
            ],
        };

    private static class AuthTypes
    {
        public static readonly Authenticated User = TestAuthentication.GetUserAuthentication();
        public static readonly Authenticated SystemUser = TestAuthentication.GetSystemUserAuthentication();
        public static readonly Authenticated ServiceOwner = TestAuthentication.GetServiceOwnerAuthentication();
        public static readonly Authenticated Org = TestAuthentication.GetOrgAuthentication();

        // No authenticated identity => no associated party => the instance owner party resolves to null.
        public static readonly Authenticated None = TestAuthentication.GetNoneAuthentication();
    }

    public static IEnumerable<object[]> TestCases =>
        [
            new TestCase(
                TestIdentifier: "1",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings("model"),
                        Attachments = [Factories.DocumentSettings("ref-data-as-pdf")],
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        CaseFileClassifications = [Factories.InstanceOwnerClassification()],
                    },
                },
                Auth: AuthTypes.User,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name"),
                ExpectedAttachmentFilenames: ["model.xml", "ref-data-as-pdf.pdf"]
            ),
            new TestCase(
                TestIdentifier: "2",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings("model", "Form.xml"),
                        Attachments =
                        [
                            Factories.DocumentSettings("ref-data-as-pdf", "Form.pdf"),
                            Factories.DocumentSettings("something-uploaded"),
                        ],
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        SystemId = TestHelpers.BindableValueFactory("custom-system-id"),
                        RuleId = TestHelpers.BindableValueFactory("custom-rule-id"),
                        CaseFileId = TestHelpers.BindableValueFactory("custom-case-file-id"),
                        CaseFileTitle = TestHelpers.BindableValueFactory("Custom Case File Title"),
                        JournalEntryTitle = TestHelpers.BindableValueFactory("Custom Journal Entry Title"),
                        CaseFileClassifications = [Factories.InstanceOwnerClassification()],
                    },
                },
                Auth: AuthTypes.SystemUser,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name"),
                ExpectedAttachmentFilenames: ["Form.xml", "Form.pdf", "receipt2.pdf", "letter.docx", "drawing_1a.jpg"]
            ),
            new TestCase(
                TestIdentifier: "3",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings("model", "Form.xml"),
                        Attachments = [Factories.DocumentSettings("doesnt-exist")],
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        CaseFileClassifications = [Factories.InstanceOwnerClassification()],
                    },
                },
                Auth: AuthTypes.ServiceOwner,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name", "123456789"),
                ExpectedAttachmentFilenames: ["Form.xml"]
            ),
            new TestCase(
                TestIdentifier: "4",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings("model", "Form.xml"),
                        Attachments = null,
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        SystemId = TestHelpers.BindableValueFactory("custom-system-id"),
                        CaseFileTitle = TestHelpers.BindableValueFactory("Custom Case File Title"),
                        JournalEntryTitle = TestHelpers.BindableValueFactory("Custom Journal Entry Title"),
                        CaseFileClassifications = [Factories.InstanceOwnerClassification()],
                    },
                },
                Auth: AuthTypes.Org,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name"),
                ExpectedAttachmentFilenames: ["Form.xml"]
            ),
            new TestCase(
                TestIdentifier: "5",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings(
                            "model",
                            "Form.pdf",
                            formatCode: "PDF/A",
                            variant: new FiksArkivCode { Code = "A", Description = "Arkivformat" }
                        ),
                        Attachments = [Factories.DocumentSettings("ref-data-as-pdf")],
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        CaseFileClassifications =
                        [
                            Factories.InstanceOwnerClassification(),
                            Factories.ConfiguredClassification(
                                "custom-system",
                                "custom-class",
                                "Custom Classification"
                            ),
                            Factories.ConfiguredClassification(
                                "custom-system-2",
                                "custom-class-2",
                                "Restricted Classification",
                                isRestricted: true
                            ),
                        ],
                    },
                },
                Auth: AuthTypes.User,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name"),
                ExpectedAttachmentFilenames: ["Form.pdf", "ref-data-as-pdf.pdf"]
            ),
            // Bare-minimum configuration: only the required PrimaryDocument is set. No metadata, attachments
            // or classifications are configured, so the generated payload exercises the library defaults
            // (default system id, application title fallbacks, instance id as case file key, no classifications).
            new TestCase(
                TestIdentifier: "6",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings { PrimaryDocument = Factories.DocumentSettings("model") },
                },
                // Authenticated.None resolves no instance owner party, asserting the generator omits the Avsender
                // korrespondansepart and still produces a schema-valid arkivmelding.
                Auth: AuthTypes.None,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name"),
                ExpectedAttachmentFilenames: ["model.xml"]
            ),
            // Maximal configuration: every payload-relevant override turned on at once. Primary document and an
            // attachment both carry custom filename/format/variant, all metadata fields are set, the classification
            // list mixes the dynamic instance-owner source with explicit (incl. restricted) entries, and an instance
            // owner party is resolved so both a recipient and a sender korrespondansepart are emitted.
            new TestCase(
                TestIdentifier: "7",
                Settings: new FiksArkivSettings
                {
                    Documents = new FiksArkivDocumentSettings
                    {
                        PrimaryDocument = Factories.DocumentSettings(
                            "model",
                            "Form.pdf",
                            formatCode: "PDF/A",
                            variant: new FiksArkivCode { Code = "A", Description = "Arkivformat" }
                        ),
                        Attachments =
                        [
                            Factories.DocumentSettings(
                                "ref-data-as-pdf",
                                "Attachment.pdf",
                                formatCode: "PDF/A",
                                variant: new FiksArkivCode { Code = "P", Description = "Produksjonsformat" }
                            ),
                            Factories.DocumentSettings("something-uploaded"),
                        ],
                    },
                    Metadata = new FiksArkivMetadataSettings
                    {
                        SystemId = TestHelpers.BindableValueFactory("custom-system-id"),
                        RuleId = TestHelpers.BindableValueFactory("custom-rule-id"),
                        CaseFileId = TestHelpers.BindableValueFactory("custom-case-file-id"),
                        CaseFileTitle = TestHelpers.BindableValueFactory("Custom Case File Title"),
                        JournalEntryTitle = TestHelpers.BindableValueFactory("Custom Journal Entry Title"),
                        CaseFileAdministrativeUnit = TestHelpers.BindableValueFactory("Custom Administrative Unit"),
                        CaseFileClassifications =
                        [
                            Factories.InstanceOwnerClassification(),
                            Factories.ConfiguredClassification(
                                "custom-system",
                                "custom-class",
                                "Custom Classification"
                            ),
                            Factories.ConfiguredClassification(
                                "custom-system-2",
                                "custom-class-2",
                                "Restricted Classification",
                                isRestricted: true
                            ),
                        ],
                    },
                },
                Auth: AuthTypes.ServiceOwner,
                Recipient: Factories.Recipient("recipient-id", "Recipient Name", "123456789"),
                ExpectedAttachmentFilenames:
                [
                    "Form.pdf",
                    "Attachment.pdf",
                    "receipt2.pdf",
                    "letter.docx",
                    "drawing_1a.jpg",
                ]
            ),
        ];

    [Theory]
    [MemberData(nameof(TestCases))]
    internal async Task GeneratePayload_GeneratesCorrectPayload(TestCase testCase)
    {
        // Arrange
        await using var fixture = CreateFixture(testCase);

        // Act
        var result = (
            await fixture.FiksArkivPayloadGenerator.GeneratePayload(
                "",
                NewDefaultInstance(),
                testCase.Recipient,
                FiksArkivConstants.MessageTypes.CreateArchiveRecord
            )
        ).ToList();

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
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());

        var ex = await Assert.ThrowsAsync<FiksArkivException>(() =>
            fixture.FiksArkivPayloadGenerator.GeneratePayload(
                "",
                new Instance(),
                Factories.Recipient("-", "-"),
                "non-create-type"
            )
        );

        Assert.Contains("Unsupported message type", ex.Message);
    }

    private static TestFixture CreateFixture(TestCase testCase)
    {
        var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton<TimeProvider>(new FakeTimeProvider(_now));
                services.Configure<GeneralSettings>(options =>
                {
                    options.HostName = "the-hostname";
                    options.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}/";
                });
            },
            [("CustomFiksArkivSettings", testCase.Settings)],
            useDefaultFiksArkivSettings: false
        );

        fixture
            .AppMetadataMock.Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app"));
        fixture
            .TranslationServiceMock.Setup(x => x.TranslateTextKey("appName", LanguageConst.Nb, null))
            .ReturnsAsync("Test app");
        fixture.AuthenticationContextMock.SetupGet(x => x.Current).Returns(testCase.Auth);
        // The instance owner party is resolved from the same authenticated identity that drives the classification,
        // so the submitter and the instance owner stay consistent instead of being hand-rolled per case. An
        // Authenticated.None identity has no party, modelling an unresolved instance owner (no Avsender emitted).
        fixture
            .PartyClientMock.Setup(x => x.GetParty(It.IsAny<int>()))
            .Returns(() => ResolveInstanceOwnerParty(testCase.Auth));
        fixture
            .DataClientMock.Setup(x =>
                x.GetDataBytes(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync("Mocked content"u8.ToArray());

        return fixture;
    }

    // Each authenticated identity carries its own associated party (see TestAuthentication), so we reuse that
    // rather than constructing a separate instance owner party that could drift from the auth context.
    // Authenticated.None has no party and resolves to null, modelling an instance owner that cannot be resolved.
    private static async Task<Party?> ResolveInstanceOwnerParty(Authenticated auth)
    {
        Party? authParty = auth switch
        {
            Authenticated.User user => await user.LookupSelectedParty(),
            Authenticated.Org org => (await org.LoadDetails()).Party,
            Authenticated.ServiceOwner serviceOwner => (await serviceOwner.LoadDetails()).Party,
            Authenticated.SystemUser systemUser => (await systemUser.LoadDetails()).Party,
            Authenticated.None => null,
            _ => throw new InvalidOperationException($"Unsupported authentication type: {auth.GetType().Name}"),
        };

        return authParty is null ? null : WithRegisterContactInfo(authParty);
    }

    // The lightweight auth party (TestAuthentication) only carries flat identity fields, whereas a real register
    // lookup (IAltinnPartyClient.GetParty) returns the nested Person/Organisation + contact details that
    // GetInstanceOwnerParty renders. Project the auth identity onto a fully-populated register party so the
    // generated korrespondansepart keeps its personid/organisasjonid and contact information.
    private static Party WithRegisterContactInfo(Party authParty)
    {
        var party = new Party
        {
            PartyId = authParty.PartyId,
            PartyUuid = authParty.PartyUuid,
            PartyTypeName = authParty.PartyTypeName,
            Name = authParty.Name,
            OrgNumber = authParty.OrgNumber,
            SSN = authParty.SSN,
        };

        if (!string.IsNullOrEmpty(authParty.SSN))
        {
            party.Person = new Person
            {
                SSN = authParty.SSN,
                TelephoneNumber = "phone-no",
                MobileNumber = "mobile-no",
                MailingAddress = "Street 1",
                MailingPostalCode = "0123",
                MailingPostalCity = "City",
            };
        }
        else if (!string.IsNullOrEmpty(authParty.OrgNumber))
        {
            party.Organization = new Organization
            {
                OrgNumber = authParty.OrgNumber,
                TelephoneNumber = "phone-no",
                MobileNumber = "mobile-no",
                MailingAddress = "Street 1",
                MailingPostalCode = "0123",
                MailingPostalCity = "City",
            };
        }

        return party;
    }

    internal sealed record TestCase(
        string TestIdentifier,
        FiksArkivSettings Settings,
        Authenticated Auth,
        FiksArkivRecipient Recipient,
        IEnumerable<string> ExpectedAttachmentFilenames
    )
    {
        public override string ToString() => TestIdentifier;

        public static implicit operator object[](TestCase testCase) => [testCase];
    }

    private static class Factories
    {
        public static FiksArkivRecipient Recipient(string identifier, string name, string? orgNumber = null) =>
            new(Guid.Empty, identifier, name, orgNumber);

        public static FiksArkivDataTypeSettings DocumentSettings(
            string dataType,
            string? filename = null,
            string? formatCode = null,
            FiksArkivCode? variant = null
        ) =>
            new()
            {
                DataType = dataType,
                Filename = filename,
                Format = formatCode is null ? null : new FiksArkivCode { Code = formatCode },
                Variant = variant,
            };

        public static FiksArkivClassification InstanceOwnerClassification() =>
            new() { Source = FiksArkivClassificationSource.InstanceOwner };

        public static FiksArkivClassification ConfiguredClassification(
            string systemId,
            string classificationId,
            string title,
            bool? isRestricted = null
        ) =>
            new()
            {
                SystemId = systemId,
                ClassificationId = classificationId,
                Title = title,
                IsRestricted = isRestricted,
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
