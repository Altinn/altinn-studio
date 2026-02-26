using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Kodelister;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv.Models;

public class FiksArkivDocumentsTest
{
    private readonly Kode _dummyCode = new("...", string.Empty);

    private static FiksIOMessagePayload CreatePayload(string filename) => new(filename, Stream.Null);

    private MessagePayloadWrapper CreateMessagePayloadWrapper(string filename, Kode? code = null) =>
        new(CreatePayload(filename), code ?? _dummyCode);

    [Fact]
    public void ToPaylods_ContainsAllDocuments_InTheCorrectOrder()
    {
        // Arrange
        var archiveDocuments = new FiksArkivDocuments(
            primaryDocument: CreateMessagePayloadWrapper("primary.txt"),
            attachmentDocuments:
            [
                CreateMessagePayloadWrapper("attachment1.txt"),
                CreateMessagePayloadWrapper("attachment2.txt"),
            ]
        );
        var expectedPayloads = new List<FiksIOMessagePayload>
        {
            CreatePayload("primary.txt"),
            CreatePayload("attachment1.txt"),
            CreatePayload("attachment2.txt"),
        };

        // Act
        var payloads = archiveDocuments.ToPayloads().ToList();

        // Assert
        Assert.Equal(expectedPayloads, payloads);
    }

    [Fact]
    public void Constructor_EnsuresUniqueFilenames()
    {
        // Arrange
        var archiveDocuments = new FiksArkivDocuments(
            primaryDocument: CreateMessagePayloadWrapper("duplicate.txt"),
            attachmentDocuments:
            [
                CreateMessagePayloadWrapper("unique.txt"),
                CreateMessagePayloadWrapper("duplicate.txt"),
            ]
        );
        List<string> expectedFilenames = ["duplicate(1).txt", "unique.txt", "duplicate(2).txt"];

        // Act
        var filenames = archiveDocuments.ToPayloads().Select(x => x.Filename).ToList();

        // Assert
        Assert.Equal(expectedFilenames, filenames);
    }
}
