using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Kodelister;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class ListExtensionsTests
{
    private static IReadOnlyList<MessagePayloadWrapper> GetPayloads(params string[] filenames)
    {
        return filenames
            .Select(filename => new MessagePayloadWrapper(
                new FiksIOMessagePayload(filename, Stream.Null),
                new Kode(".", string.Empty)
            ))
            .ToList();
    }

    [Fact]
    public void EnsureUniqueFilenames_NoDuplicates_DoesNotChangeFilenames()
    {
        // Arrange
        var payloads = GetPayloads("file1.txt", "file2.txt");
        var originalFilenames = payloads.Select(p => p.Payload.Filename).ToList();

        // Act
        payloads.EnsureUniqueFilenames();

        // Assert
        Assert.Equal(originalFilenames, payloads.Select(p => p.Payload.Filename));
    }

    [Fact]
    public void EnsureUniqueFilenames_WithDuplicates_ChangesFilenamesToUnique()
    {
        // Arrange
        var payloads = GetPayloads(
            "duplicate(1).txt", // pre-existing numbered filename
            "duplicate.txt",
            "duplicate.txt",
            "duplicate.doc",
            "duplicate.doc",
            "extensionless_duplicate",
            "extensionless_duplicate",
            "unique.txt"
        );
        List<string> expectedFilenames =
        [
            "duplicate(1).txt",
            "duplicate(2).txt",
            "duplicate(3).txt",
            "duplicate(1).doc",
            "duplicate(2).doc",
            "extensionless_duplicate(1)",
            "extensionless_duplicate(2)",
            "unique.txt",
        ];

        // Act
        payloads.EnsureUniqueFilenames();

        // Assert
        Assert.Equal(expectedFilenames, payloads.Select(p => p.Payload.Filename));
    }

    [Fact]
    public void EnsureUniqueFilenames_WithCaseInsensitiveDuplicates_ChangesFilenamesToUnique()
    {
        // Arrange
        var payloads = GetPayloads("duplicate.txt", "DUpliCaTe.txT");
        List<string> expectedFilenames = ["duplicate(1).txt", "DUpliCaTe(2).txT"];

        // Act
        payloads.EnsureUniqueFilenames();

        // Assert
        Assert.Equal(expectedFilenames, payloads.Select(p => p.Payload.Filename));
    }
}
