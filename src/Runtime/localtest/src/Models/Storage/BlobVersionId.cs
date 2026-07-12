using System;
using System.Buffers.Text;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Platform.Storage.Models;

internal static class BlobVersionId
{
    public static string Encode(Guid version)
    {
        return Base64Url.EncodeToString(version.ToByteArray(bigEndian: true));
    }

    public static Guid Decode(string versionId)
    {
        if (string.IsNullOrEmpty(versionId))
        {
            throw new ArgumentException("Blob version id cannot be empty.", nameof(versionId));
        }

        if (versionId.Length != 22)
        {
            throw new FormatException("Blob version id must be 22 characters.");
        }

        Span<byte> bytes = stackalloc byte[16];
        try
        {
            if (
                !Base64Url.TryDecodeFromChars(versionId, bytes, out int bytesWritten)
                || bytesWritten != 16
            )
            {
                throw new FormatException("Blob version id must decode to 16 bytes.");
            }
        }
        catch (FormatException exception)
        {
            throw new FormatException("Invalid blob version id.", exception);
        }

        return new Guid(bytes, bigEndian: true);
    }

    public static string? ToContentEtag(string? blobVersionId)
    {
        return string.IsNullOrEmpty(blobVersionId) ? null : $"\"{blobVersionId}\"";
    }

    public static bool TryParseContentEtag(
        string? etag,
        [NotNullWhen(true)] out string? blobVersionId
    )
    {
        blobVersionId = null;
        if (etag is not { Length: >= 2 } || etag[0] != '"' || etag[^1] != '"')
        {
            return false;
        }

        string candidate = etag[1..^1];
        try
        {
            Decode(candidate);
        }
        catch (Exception exception) when (exception is ArgumentException or FormatException)
        {
            return false;
        }

        blobVersionId = candidate;
        return true;
    }
}
