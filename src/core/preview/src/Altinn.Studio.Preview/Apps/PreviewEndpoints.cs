using Altinn.Studio.Common;
using Altinn.Studio.Preview.AppApi;
using Altinn.Studio.Preview.Configuration;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

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

    /// <summary>
    /// The first segments of the app backend's API. An unknown path there is a missing endpoint, not a page of the
    /// frontend's.
    /// </summary>
    private static readonly string[] s_apiSegments = ["api", "instances", "v1"];

    private static readonly FileExtensionContentTypeProvider s_contentTypes = new();

    private static readonly string[] s_readMethods = [HttpMethods.Get, HttpMethods.Head];

    public static IEndpointRouteBuilder MapPreviewEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder app = endpoints
            .MapGroup(PreviewUrls.RoutePrefix)
            .RequirePublicPort()
            .AddEndpointFilter<FramedOnlyFilter>()
            .AddEndpointFilter<SessionFilter>();

        app.MapAppApi();
        app.MapMethods("/{**path}", s_readMethods, ServeFileOrPage);

        return endpoints;
    }

    /// <summary>
    /// A file from the app's <c>wwwroot</c>, as a real app serves them, or else the page of the frontend's routes,
    /// which the frontend's router shows the right view on.
    /// </summary>
    private static IResult ServeFileOrPage(HttpContext context, string? path, IOptions<PreviewOptions> options)
    {
        PreviewSessionFeature session = context.Features.GetRequiredFeature<PreviewSessionFeature>();
        if (!string.IsNullOrEmpty(path))
        {
#pragma warning disable CA2000 // Results.File disposes the stream once the response is written.
            Stream? file = session.Folder.OpenRead(AppFilesFolder + path);
#pragma warning restore CA2000
            if (file is not null)
            {
                string contentType = s_contentTypes.TryGetContentType(path, out string? knownType)
                    ? knownType
                    : DefaultContentType;
                return Results.File(file, contentType);
            }
        }

        if (!IsPageRoute(path))
        {
            return Results.NotFound();
        }

        string? page = IndexPage.Generate(
            new AppFiles(session.Folder),
            session.Id,
            session.Session.WorkingCopy,
            options.Value.StudioOrigin,
            context.Request.Query["lang"]
        );
        return page is null ? Results.NotFound() : Results.Content(page, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Whether a path can be one of the frontend's routes, such as <c>instance/{partyId}/{instanceGuid}/{taskId}</c>
    /// or a stateless page's name. Those have no file extension and aren't in the API.
    /// </summary>
    private static bool IsPageRoute(string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return true;
        }

        string[] segments = path.Split('/');
        return !s_apiSegments.Contains(segments[0], StringComparer.Ordinal) && !segments[^1].Contains('.');
    }
}
