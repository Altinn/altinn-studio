using System.Security.Cryptography;
using System.Text;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>
/// Deterministic idempotency keys for the outbound calls signee initialization makes, so a retried or resumed
/// step repeats a call with the same key and the receiving platform deduplicates it.
/// </summary>
internal static class SigningIdempotencyKey
{
    /// <summary>
    /// Namespace for every key this class derives. Changing it changes every key, so a workflow in flight across
    /// the change would re-send; it is therefore fixed.
    /// </summary>
    private static readonly Guid _namespace = new("5c1f6e3a-2b7d-4c0e-9a8f-3d2e1b0c9a87");

    /// <summary>
    /// The key for one frozen recipient's call to action within a task entry. Stable across callback retries,
    /// workflow resume and re-enqueue; a later task entry has a different state element identity.
    /// </summary>
    public static Guid ForCallToAction(Guid signeeStateElementId, Guid signeeId) =>
        Derive($"call-to-action:{signeeStateElementId:D}:{signeeId:D}");

    /// <summary>
    /// A name-based UUID (RFC 9562 version 8): SHA-256 of the namespace and the name, folded to 16 bytes with
    /// the version and variant bits set. Pinned by known-answer tests, so the derivation cannot drift between
    /// releases.
    /// </summary>
    private static Guid Derive(string name)
    {
        byte[] namespaceBytes = ToRfcByteOrder(_namespace.ToByteArray());
        byte[] nameBytes = Encoding.UTF8.GetBytes(name);
        byte[] input = new byte[namespaceBytes.Length + nameBytes.Length];
        namespaceBytes.CopyTo(input, 0);
        nameBytes.CopyTo(input, namespaceBytes.Length);

        Span<byte> hash = stackalloc byte[32];
        SHA256.HashData(input, hash);

        byte[] uuid = hash[..16].ToArray();
        uuid[6] = (byte)((uuid[6] & 0x0F) | 0x80);
        uuid[8] = (byte)((uuid[8] & 0x3F) | 0x80);

        return new Guid(ToRfcByteOrder(uuid));
    }

    /// <summary>
    /// <see cref="Guid.ToByteArray()"/> stores the first three fields little-endian; the RFC byte order is
    /// big-endian. The swap is its own inverse, so it converts in both directions.
    /// </summary>
    private static byte[] ToRfcByteOrder(byte[] bytes)
    {
        byte[] result = (byte[])bytes.Clone();
        (result[0], result[3]) = (result[3], result[0]);
        (result[1], result[2]) = (result[2], result[1]);
        (result[4], result[5]) = (result[5], result[4]);
        (result[6], result[7]) = (result[7], result[6]);
        return result;
    }
}
