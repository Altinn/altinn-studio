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
            int bytesWritten = Base64Url.DecodeFromChars(versionId, bytes);
            if (bytesWritten != bytes.Length)
            {
                throw new FormatException("Blob version id decoded to an invalid length.");
            }
        }
        catch (FormatException exception)
        {
            throw new FormatException("Invalid blob version id.", exception);
        }

        return new Guid(bytes, bigEndian: true);
    }

    public static bool TryDecode(string? versionId, out Guid version)
    {
        version = Guid.Empty;
        if (versionId is null)
        {
            return false;
        }

        try
        {
            version = Decode(versionId);
            return true;
        }
        catch (Exception exception) when (exception is ArgumentException or FormatException)
        {
            return false;
        }
    }

    public static string? ToETag(string? blobVersionId)
    {
        return string.IsNullOrEmpty(blobVersionId) ? null : $"\"{blobVersionId}\"";
    }

    public static bool TryParseETag(string? etag, [NotNullWhen(true)] out string? blobVersionId)
    {
        blobVersionId = null;
        if (etag is not { Length: >= 2 } || etag[0] != '"' || etag[^1] != '"')
        {
            return false;
        }

        string candidate = etag[1..^1];
        if (!TryDecode(candidate, out _))
        {
            return false;
        }

        blobVersionId = candidate;
        return true;
    }
}
