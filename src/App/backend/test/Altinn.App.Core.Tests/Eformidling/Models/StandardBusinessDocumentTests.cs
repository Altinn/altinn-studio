using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.EFormidling.Models.SBD;

namespace Altinn.App.Core.Tests.Eformidling.Models;

/// <summary>
/// Guards the Standard Business Document envelope against a payload captured from a real shipment,
/// carried over from the eFormidling client package's own test data. The C# names changed in v9
/// (<c>Arkivmelding</c> became <c>ArkivmeldingMetadata</c>, <c>DPF</c> became <c>Dpf</c>) while the
/// JSON deliberately did not, so binding against a payload nobody here wrote is what proves it.
/// </summary>
public class StandardBusinessDocumentTests
{
    /// <summary>
    /// Web defaults, matching what the client itself uses to read the integrasjonspunkt's responses.
    /// </summary>
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private static string CapturedDocument()
    {
        const string resource = "Altinn.App.Core.Tests.Eformidling.Models.TestData.sbd.json";
        using Stream stream =
            Assembly.GetExecutingAssembly().GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded payload '{resource}' was not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    [Fact]
    public void A_captured_document_binds_to_every_part_of_the_envelope()
    {
        StandardBusinessDocument? sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(
            CapturedDocument(),
            _jsonOptions
        );

        Assert.NotNull(sbd);

        StandardBusinessDocumentHeader? header = sbd.StandardBusinessDocumentHeader;
        Assert.NotNull(header);
        Assert.Equal("1.0", header.HeaderVersion);

        Assert.NotNull(header.Sender);
        Sender sender = Assert.Single(header.Sender);
        Assert.Equal("0192:910075918", sender.Identifier?.Value);
        Assert.Equal("iso6523-actorid-upis", sender.Identifier?.Authority);
        Assert.Empty(Assert.IsType<List<object>>(sender.ContactInformation));

        Assert.NotNull(header.Receiver);
        Receiver receiver = Assert.Single(header.Receiver);
        Assert.Equal("0192:910075918", receiver.Identifier?.Value);

        DocumentIdentification? identification = header.DocumentIdentification;
        Assert.NotNull(identification);
        Assert.Equal("arkivmelding", identification.Type);
        Assert.Equal("urn:no:difi:arkivmelding:xsd::arkivmelding", identification.Standard);
        Assert.Equal("2.0", identification.TypeVersion);
        Assert.Equal("dddf6910-6bde-11eb-83f7-e5be6c2ac43bo", identification.InstanceIdentifier);

        Assert.NotNull(header.BusinessScope?.Scope);
        Scope scope = Assert.Single(header.BusinessScope.Scope);
        Assert.Equal("ConversationId", scope.Type);
        Assert.Equal("urn:no:difi:profile:arkivmelding:administrasjon:ver1.0", scope.Identifier);

        Assert.NotNull(scope.ScopeInformation);
        ScopeInformation scopeInformation = Assert.Single(scope.ScopeInformation);
        Assert.Equal(
            new DateTime(2021, 2, 27, 22, 59, 0, DateTimeKind.Utc),
            scopeInformation.ExpectedResponseDateTime.ToUniversalTime()
        );
    }

    [Fact]
    public void The_renamed_arkivmelding_metadata_still_reads_the_arkivmelding_property()
    {
        // The rename is C#-only. If it had reached the wire, this is where it would show.
        StandardBusinessDocument? sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(
            CapturedDocument(),
            _jsonOptions
        );

        ArkivmeldingMetadata? metadata = sbd?.Arkivmelding;

        Assert.NotNull(metadata);
        Assert.Equal(3, metadata.Sikkerhetsnivaa);
        Assert.Null(metadata.Dpf);
    }

    [Fact]
    public void An_absent_header_deserializes_to_null_rather_than_an_empty_envelope()
    {
        // The package's own test asserted this, against a payload whose header and arkivmelding are
        // the wrong shape entirely. A silently-empty envelope would be shipped as a valid one.
        const string mismatched = """
            { "standardBusinessDocumentHeader": null, "arkivmelding": null }
            """;

        StandardBusinessDocument? sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(mismatched, _jsonOptions);

        Assert.NotNull(sbd);
        Assert.Null(sbd.StandardBusinessDocumentHeader);
        Assert.Null(sbd.Arkivmelding);
    }

    [Fact]
    public Task A_round_trip_preserves_the_wire_shape()
    {
        // Deserialize then re-serialize the captured payload: the snapshot pins the property names and
        // nesting the integrasjonspunkt actually receives, independently of what we call them in C#.
        StandardBusinessDocument? sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(
            CapturedDocument(),
            _jsonOptions
        );

        string roundTripped = JsonSerializer.Serialize(
            sbd,
            new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }
        );

        return Verify(roundTripped).UseDirectory(".Verify");
    }
}
