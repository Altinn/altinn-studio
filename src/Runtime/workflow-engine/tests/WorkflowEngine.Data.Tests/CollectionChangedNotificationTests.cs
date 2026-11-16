namespace WorkflowEngine.Data.Tests;

public class CollectionChangedNotificationTests
{
    [Theory]
    [InlineData("ttd/app", "key")]
    [InlineData("ttd", "app/key")]
    [InlineData("ns:with\"quotes\"", "key,with,commas")]
    [InlineData("[\"ns\",", "\"key\"]")]
    [InlineData("æøå", "😀\n\t\\")]
    public void Payload_RoundTripsAnyNamespaceAndKey(string ns, string key)
    {
        // Arrange
        var collection = new CollectionId(ns, key);

        // Act
        var decoded = CollectionChangedNotification.TryDecode(
            CollectionChangedNotification.Encode(collection),
            out var roundTripped
        );

        // Assert
        Assert.True(decoded);
        Assert.Equal(collection, roundTripped);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[\"only-one\"]")]
    [InlineData("[\"ns\",null]")]
    [InlineData("[\"ns\",\"key\",\"extra\"]")]
    public void TryDecode_RefusesWhatEncodeNeverWrites(string payload)
    {
        // Act
        var decoded = CollectionChangedNotification.TryDecode(payload, out _);

        // Assert
        Assert.False(decoded);
    }
}
