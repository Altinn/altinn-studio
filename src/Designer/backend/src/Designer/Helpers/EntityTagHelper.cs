using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// ETag and If-Match support for v9 settings documents.
/// </summary>
public static class EntityTagHelper
{
    private static readonly JsonSerializerOptions s_serializerOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Computes a quoted SHA-256 tag using System.Text.Json web defaults.
    /// Use the same document for the tag and response body, even when the response uses another serializer.
    /// </summary>
    public static string ComputeEntityTag<T>(T document) =>
        $"\"{Convert.ToHexStringLower(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(document, s_serializerOptions)))}\"";

    /// <summary>
    /// Evaluates the <c>If-Match</c> header of a save request against the entity tag of the stored document.
    /// </summary>
    /// <returns>
    /// <c>null</c> for a strong match or <c>*</c>, 428 when the header is missing, and 412 otherwise.
    /// </returns>
    public static ObjectResult? CheckIfMatch(HttpRequest request, string currentEntityTag)
    {
        if (StringValues.IsNullOrEmpty(request.Headers.IfMatch))
        {
            return new ObjectResult("An If-Match header with the entity tag of the loaded document is required.")
            {
                StatusCode = StatusCodes.Status428PreconditionRequired,
            };
        }

        var current = new EntityTagHeaderValue(currentEntityTag);
        bool matches = request
            .GetTypedHeaders()
            .IfMatch.Any(tag =>
                tag.Equals(EntityTagHeaderValue.Any) || tag.Compare(current, useStrongComparison: true)
            );
        return matches
            ? null
            : new ObjectResult("The document has changed since it was loaded. Reload it before saving.")
            {
                StatusCode = StatusCodes.Status412PreconditionFailed,
            };
    }
}
