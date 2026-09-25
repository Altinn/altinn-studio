using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Mime;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Serves files from published Altinn app frontend distributions. The distributions are public, so the
/// endpoints accept anonymous callers as well as Studio sessions and API keys.
/// </summary>
[ApiController]
[AllowAnonymous]
[AllowApiKey]
[Route("designer/app-dist")]
public partial class AppDistController(IAppDistProvider appDistProvider) : ControllerBase
{
    private const string SchemasLayerPathPrefix = "schemas/json/";

    private static readonly FileExtensionContentTypeProvider s_contentTypeProvider = new();
    private static readonly CacheControlHeaderValue s_immutableCacheControl = new()
    {
        Public = true,
        MaxAge = TimeSpan.FromDays(365),
        Extensions = { new NameValueHeaderValue("immutable") },
    };

    /// <summary>
    /// Lists the published app frontend versions, in ascending Semantic Versioning precedence.
    /// </summary>
    [HttpGet("versions")]
    public async Task<IReadOnlyList<string>> GetVersions(CancellationToken cancellationToken) =>
        await appDistProvider.ListVersions(cancellationToken);

    /// <summary>
    /// Serves one file from the app frontend distribution of <paramref name="version"/>, or lists the files
    /// below a directory when <paramref name="path"/> is empty or ends with a slash.
    /// </summary>
    /// <param name="version">The published app frontend version.</param>
    /// <param name="path">The file or directory path relative to the distribution root.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    [HttpGet("{version}/{**path}")]
    public async Task<IActionResult> GetFileOrDirectory(
        string version,
        string? path,
        CancellationToken cancellationToken
    )
    {
        if (!VersionPattern().IsMatch(version))
        {
            return BadRequest($"Invalid version \"{version}\".");
        }

        path ??= string.Empty;
        bool isDirectory = path.Length == 0 || path.EndsWith('/');
        string trimmedPath = isDirectory && path.Length > 0 ? path[..^1] : path;
        if (path.Length > 0 && !IsSafePath(trimmedPath))
        {
            return BadRequest("Invalid path.");
        }

        IAppDistContent? content = await appDistProvider.GetLayer(version, LayerFor(path), cancellationToken);
        if (content is null)
        {
            return NotFound($"App frontend version \"{version}\" has not been published.");
        }

        return isDirectory
            ? await ListDirectory(content, path, cancellationToken)
            : await ServeFile(content, path, cancellationToken);
    }

    private async Task<IActionResult> ListDirectory(
        IAppDistContent content,
        string directoryPrefix,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<string> files = await content.ListFiles(cancellationToken);
        List<string> matches = files.Where(f => f.StartsWith(directoryPrefix, StringComparison.Ordinal)).ToList();
        if (matches.Count == 0)
        {
            return NotFound($"App frontend version \"{content.Version}\" has no directory \"{directoryPrefix}\".");
        }

        MarkResponseImmutable();
        return Ok(matches);
    }

    private async Task<IActionResult> ServeFile(
        IAppDistContent content,
        string filePath,
        CancellationToken cancellationToken
    )
    {
        Stream fileStream;
        try
        {
            fileStream = await content.OpenFile(filePath, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            return NotFound($"App frontend version \"{content.Version}\" has no file \"{filePath}\".");
        }

        string contentType = s_contentTypeProvider.TryGetContentType(filePath, out string? knownContentType)
            ? knownContentType
            : MediaTypeNames.Application.Octet;
        MarkResponseImmutable();
        return File(fileStream, contentType);
    }

    /// <summary>
    /// Published versions never change, so successful responses can be cached by browsers and shared caches
    /// indefinitely. Error responses are left uncached since a later publish or fix may change them.
    /// </summary>
    private void MarkResponseImmutable() => Response.GetTypedHeaders().CacheControl = s_immutableCacheControl;

    private static AppDistLayer LayerFor(string path) =>
        path.StartsWith(SchemasLayerPathPrefix, StringComparison.Ordinal) ? AppDistLayer.Schemas : AppDistLayer.Content;

    private static bool IsSafePath(string path)
    {
        if (path.Contains('\\', StringComparison.Ordinal) || path.StartsWith('/'))
        {
            return false;
        }

        foreach (string segment in path.Split('/'))
        {
            if (segment.Length == 0 || segment == "." || segment == "..")
            {
                return false;
            }
        }

        return true;
    }

    [GeneratedRegex("^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$")]
    private static partial Regex VersionPattern();
}
