using Altinn.App.Core.Features.Signing.Helpers;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SignatureHashHelperTests
{
    // Storage's DataService.FormatShaDigest produces the same string for the same bytes; these vectors pin the
    // shared format (lowercase hex, no delimiters) so the validator and the signer cannot drift apart.
    public static TheoryData<byte[], string> KnownVectors =>
        new()
        {
            { "abc"u8.ToArray(), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
            { [], "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
        };

    [Theory]
    [MemberData(nameof(KnownVectors))]
    public void GenerateSha256Hash_Span_ReturnsLowercaseHex(byte[] input, string expected)
    {
        string result = SignatureHashHelper.GenerateSha256Hash(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [MemberData(nameof(KnownVectors))]
    public async Task GenerateSha256Hash_Stream_ReturnsLowercaseHex(byte[] input, string expected)
    {
        using var stream = new MemoryStream(input);

        string result = await SignatureHashHelper.GenerateSha256Hash(stream);

        Assert.Equal(expected, result);
    }
}
