using Altinn.Studio.Common;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;

namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// What browsers reach on the public port. Every route starts with <see cref="PreviewUrls.RoutePrefix"/>.
/// <see cref="FramedOnlyFilter"/> and then <see cref="SessionFilter"/> check a request before a route runs.
/// </summary>
internal static class PreviewEndpoints
{
    /// <summary>The folder the app frontend loads an app's own files from, such as the images in its forms.</summary>
    private const string AppFilesFolder = "App/wwwroot/";

    private const string DefaultContentType = "application/octet-stream";

    private static readonly FileExtensionContentTypeProvider s_contentTypes = new();

    private static readonly string[] s_readMethods = [HttpMethods.Get, HttpMethods.Head];

    public static IEndpointRouteBuilder MapPreviewEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder app = endpoints
            .MapGroup(PreviewUrls.RoutePrefix)
            .RequirePublicPort()
            .AddEndpointFilter<FramedOnlyFilter>()
            .AddEndpointFilter<SessionFilter>();

        app.MapMethods("/{**path}", s_readMethods, ServeAppFile);

        return endpoints;
    }

    private static IResult ServeAppFile(HttpContext context, string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return Results.NotFound();
        }

        PreviewSessionFeature session = context.Features.GetRequiredFeature<PreviewSessionFeature>();
#pragma warning disable CA2000 // Results.File disposes the stream once the response is written.
        Stream? file = session.Folder.OpenRead(AppFilesFolder + path);
#pragma warning restore CA2000
        if (file is null)
        {
            return Results.NotFound();
        }

        string contentType = s_contentTypes.TryGetContentType(path, out string? knownType)
            ? knownType
            : DefaultContentType;
        return Results.File(file, contentType);
    }
}
