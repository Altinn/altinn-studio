using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivDefaultPayloadGeneratorTest
{
    //Example Instance ID = "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90"

    private static readonly XsdValidator _xsdValidator = new();
    private static readonly DateTimeOffset _now = DateTimeOffset.Parse("2025-10-24T09:58:00.000000Z");

    /// <summary>
    /// Who owns the instance being archived. The owner drives both the sender korrespondansepart and the
    /// <see cref="FiksArkivClassificationSource.InstanceOwner"/> classification, so the two always agree.
    /// </summary>
    internal enum TestInstanceOwner
    {
        Person,
        Organization,

        // The register does not know the party and the instance carries no identifier, modelling an owner that
        // cannot be resolved (no Avsender emitted).
        Unresolved,
    }

    // Built fresh per test invocation so no test case can leak instance state into another.
    private static Instance NewDefaultInstance(TestInstanceOwner owner) =>
        new()
        {
            Id = "12345/88d9baf8-2f9f-4e66-9a2f-7d345e60ed90",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner
            {
                PartyId = "12345",
                PersonNumber = owner is TestInstanceOwner.Person ? Factories.PersonNumber : null,
                OrganisationNumber = owner is TestInstanceOwner.Organization ? Factories.OrganizationNumber : null,
            },
            Data =
            [
                Factories.DataElement("model", null, "application/xml"),
                Factories.DataElement("ref-data-as-pdf", null, "application/pdf"),
                Factories.DataElement("something-uploaded", "receipt2.pdf", null),
                Factories.DataElement("something-uploaded", "letter.docx", null),
                Factories.DataElement("something-uploaded", "drawing_1a.jpg", null),
            ],
        };

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
                Owner: TestInstanceOwner.Person,
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
                Owner: TestInstanceOwner.Organization,
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
                Owner: TestInstanceOwner.Organization,
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
                Owner: TestInstanceOwner.Organization,
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
                Owner: TestInstanceOwner.Person,
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
                // An unresolved owner has no register party, asserting the generator omits the Avsender
                // korrespondansepart and still produces a schema-valid arkivmelding.
                Owner: TestInstanceOwner.Unresolved,
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
                Owner: TestInstanceOwner.Organization,
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
        var dataAccessor = Factories.DataAccessor(NewDefaultInstance(testCase.Owner));

        // Act
        var result = (
            await fixture.FiksArkivPayloadGenerator.GeneratePayload(
                "",
                testCase.Recipient,
                FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                _now,
                dataAccessor.Object
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
                Factories.Recipient("-", "-"),
                "non-create-type",
                _now,
                Mock.Of<IInstanceDataAccessor>()
            )
        );

        Assert.Contains("Unsupported message type", ex.Message);
    }

    [Fact]
    internal async Task GeneratePayload_ReadsDocumentBytesFromAccessor()
    {
        // Arrange: one primary document and one attachment => exactly two reads, all through the caller's unit of
        // work, or a retried step could archive different bytes than the ones staged on it. The strict mock pins
        // down exactly which accessor members the pipeline touches; a new read fails here instead of going unnoticed.
        var testCase = TestCases.Select(x => (TestCase)x[0]).Single(x => x.TestIdentifier == "1");
        await using var fixture = CreateFixture(testCase);
        var dataAccessor = Factories.DataAccessor(
            NewDefaultInstance(testCase.Owner),
            "Accessor content",
            MockBehavior.Strict
        );

        // Act
        var result = await fixture.FiksArkivPayloadGenerator.GeneratePayload(
            "",
            testCase.Recipient,
            FiksArkivConstants.MessageTypes.CreateArchiveRecord,
            _now,
            dataAccessor.Object
        );

        // Assert
        Assert.NotNull(result);
        dataAccessor.Verify(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()), Times.Exactly(2));
    }

    [Fact]
    internal async Task GeneratePayload_WithExecutionReferenceTime_UsesOneUtcInstantForEveryGeneratedDate()
    {
        // Arrange: half past midnight on New Year's Day in Oslo, which is still New Year's Eve in UTC. Every generated
        // date must derive from the same UTC instant: the offset-less date and year fields follow the UTC calendar
        // day, and the timestamps carry the UTC designator, so the archive never has to guess the offset.
        var testCase = TestCases.Select(x => (TestCase)x[0]).Single(x => x.TestIdentifier == "1");
        await using var fixture = CreateFixture(testCase);
        var dataAccessor = Factories.DataAccessor(NewDefaultInstance(testCase.Owner));
        DateTimeOffset executionReferenceTime = DateTimeOffset.Parse("2026-01-01T00:30:45+01:00");
        DateTime expectedUtcTime = new(2025, 12, 31, 23, 30, 45, DateTimeKind.Utc);

        // Act
        var result = await fixture.FiksArkivPayloadGenerator.GeneratePayload(
            "Task_1",
            testCase.Recipient,
            FiksArkivConstants.MessageTypes.CreateArchiveRecord,
            executionReferenceTime,
            dataAccessor.Object
        );

        // Assert
        string archiveMessageXml = result
            .Single(x => x.Filename == FiksArkivConstants.Filenames.ArchiveRecord)
            .Data.ReadToString();
        Arkivmelding archiveMessage = archiveMessageXml.DeserializeXml<Arkivmelding>()!;
        Saksmappe caseFile = Assert.IsType<Saksmappe>(archiveMessage.Mappe);
        Journalpost journalEntry = Assert.IsType<Journalpost>(archiveMessage.Registrering);

        Assert.Equal(expectedUtcTime.Year, caseFile.Saksaar);
        Assert.Equal(expectedUtcTime.Date, caseFile.Saksdato);
        Assert.Equal(expectedUtcTime.Year, journalEntry.Journalaar);
        Assert.Equal(expectedUtcTime.Date, journalEntry.DokumentetsDato);
        Assert.Equal(expectedUtcTime, journalEntry.SendtDato);
        Assert.NotEmpty(journalEntry.Dokumentbeskrivelse);
        Assert.All(journalEntry.Dokumentbeskrivelse, document => Assert.Equal(expectedUtcTime, document.OpprettetDato));

        Assert.Contains("<saksaar>2025</saksaar>", archiveMessageXml);
        Assert.Contains("<saksdato>2025-12-31</saksdato>", archiveMessageXml);
        Assert.Contains("<journalaar>2025</journalaar>", archiveMessageXml);
        Assert.Contains("<dokumentetsDato>2025-12-31</dokumentetsDato>", archiveMessageXml);
        Assert.Contains("<sendtDato>2025-12-31T23:30:45Z</sendtDato>", archiveMessageXml);
        Assert.Contains("<opprettetDato>2025-12-31T23:30:45Z</opprettetDato>", archiveMessageXml);
    }

    private static TestFixture CreateFixture(TestCase testCase)
    {
        var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
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
        // The register lookup serves both the sender korrespondansepart and the instance owner classification's
        // title, so the two are driven from the same owner rather than being hand-rolled per case.
        fixture
            .PartyClientMock.Setup(x => x.GetParty(It.IsAny<int>(), It.IsAny<StorageAuthenticationMethod?>()))
            .ReturnsAsync(Factories.RegisterParty(testCase.Owner));

        return fixture;
    }

    internal sealed record TestCase(
        string TestIdentifier,
        FiksArkivSettings Settings,
        TestInstanceOwner Owner,
        FiksArkivRecipient Recipient,
        IEnumerable<string> ExpectedAttachmentFilenames
    )
    {
        public override string ToString() => TestIdentifier;

        public static implicit operator object[](TestCase testCase) => [testCase];
    }

    private static class Factories
    {
        public const string PersonNumber = "12345678901";
        public const string OrganizationNumber = "405003309";

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

        // What a real register lookup (IAltinnPartyClient.GetParty) returns for the owner: the nested
        // Person/Organisation with contact details that the sender korrespondansepart renders.
        public static Party? RegisterParty(TestInstanceOwner owner) =>
            owner switch
            {
                TestInstanceOwner.Person => new Party
                {
                    PartyId = 12345,
                    Name = "Test Testesen",
                    SSN = PersonNumber,
                    Person = new Person
                    {
                        SSN = PersonNumber,
                        TelephoneNumber = "phone-no",
                        MobileNumber = "mobile-no",
                        MailingAddress = "Street 1",
                        MailingPostalCode = "0123",
                        MailingPostalCity = "City",
                    },
                },
                TestInstanceOwner.Organization => new Party
                {
                    PartyId = 12345,
                    Name = "Test AS",
                    OrgNumber = OrganizationNumber,
                    Organization = new Organization
                    {
                        OrgNumber = OrganizationNumber,
                        TelephoneNumber = "phone-no",
                        MobileNumber = "mobile-no",
                        MailingAddress = "Street 1",
                        MailingPostalCode = "0123",
                        MailingPostalCity = "City",
                    },
                },
                TestInstanceOwner.Unresolved => null,
                _ => throw new ArgumentOutOfRangeException(nameof(owner), owner, null),
            };

        // The generator reads every document through the caller's unit of work, never through Storage directly,
        // so the accessor is the only data source a test has to provide.
        public static Mock<IInstanceDataAccessor> DataAccessor(
            Instance instance,
            string content = "Mocked content",
            MockBehavior behavior = MockBehavior.Default
        )
        {
            var dataAccessor = new Mock<IInstanceDataAccessor>(behavior);
            dataAccessor.Setup(x => x.Instance).Returns(instance);
            // The config resolver initializes layout state for the accessor's task and language when it resolves
            // bound metadata. Under MockBehavior.Strict these are the only reads allowed besides the document bytes.
            dataAccessor.Setup(x => x.TaskId).Returns("Task_1");
            dataAccessor.Setup(x => x.Language).Returns((string?)null);
            dataAccessor
                .Setup(x => x.GetBinaryData(It.IsAny<DataElementIdentifier>()))
                .ReturnsAsync(System.Text.Encoding.UTF8.GetBytes(content));

            return dataAccessor;
        }
    }
}
