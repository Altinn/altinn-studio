using System.Runtime.ExceptionServices;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Represents the Options API.
/// </summary>
[Route("{org}/{app}/api/options")]
[ApiController]
public class OptionsController : ControllerBase
{
    private readonly IAppOptionsService _appOptionsService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OptionsController"/> class.
    /// </summary>
    /// <param name="appOptionsService">Service for handling app options</param>
    public OptionsController(IAppOptionsService appOptionsService)
    {
        _appOptionsService = appOptionsService;
    }

    /// <summary>
    /// Api that exposes app related options.
    /// </summary>
    /// <remarks>The tags field is only populated when requesting library code lists.</remarks>
    /// <param name="optionsIdOrLibraryRef">
    /// The optionsId configured for the options provider in the app startup,
    /// or a library reference on the format: `lib**{creatorOrg}**{codeListId}**{version}`
    /// (version="latest", if you want the latest version).
    /// </param>
    /// <param name="queryParams">Query parameters supplied.</param>
    /// <param name="language">The language selected by the user (ISO 639-1, e.g., 'nb').</param>
    /// <returns>The options list.</returns>
    [ProducesResponseType(typeof(List<AppOption>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [HttpGet("{optionsIdOrLibraryRef}")]
    public async Task<IActionResult> Get(
        [FromRoute] string optionsIdOrLibraryRef,
        [FromQuery] Dictionary<string, string> queryParams,
        [FromQuery] string? language = null
    )
    {
        var results = await _appOptionsService.GetOptionsAsync(
            [new AppOptionsLookup(optionsIdOrLibraryRef, queryParams)],
            language,
            dataAccessor: null,
            HttpContext.RequestAborted
        );
        var result = results[0];
        if (result.Error is HttpRequestException exception)
        {
            return Problem(
                statusCode: (int?)exception.StatusCode,
                title: $"Something went wrong while getting optionsIdOrLibraryRef: {optionsIdOrLibraryRef}",
                detail: exception.Message
            );
        }

        if (result.Error is { } error)
        {
            ExceptionDispatchInfo.Throw(error);
        }

        if (result.AppOptions?.Options == null)
        {
            if (result.Source == AppOptionsSource.InstanceProvider)
            {
                return NotFound(
                    "An instance app options provider was found. "
                        + "Call the options endpoint that requires instanceOwnerPartyId and instanceId instead to retrieve them."
                );
            }
            return NotFound();
        }

        HttpContext.Response.Headers.Append(
            "Altinn-DownstreamParameters",
            result.AppOptions.Parameters.ToUrlEncodedNameValueString(',')
        );

        return Ok(result.AppOptions.Options);
    }

    /// <summary>
    /// Exposes options related to the app and logged in user.
    /// </summary>
    /// <remarks>The tags field is only populated when requesting library code lists.</remarks>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
    /// <param name="instanceGuid">Unique id to identify the instance.</param>
    /// <param name="optionsIdOrLibraryRef">
    /// The optionsId configured for the options provider in the app startup,
    /// or a library reference on the format: `lib**{creatorOrg}**{codeListId}**{version}`
    /// (version="latest", if you want the latest version).
    /// </param>
    /// <param name="language">The language selected by the user (ISO 639-1, e.g., 'nb').</param>
    /// <param name="queryParams">Query parameters supplied.</param>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(List<AppOption>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [Route("/{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/options/{optionsIdOrLibraryRef}")]
    public async Task<IActionResult> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string optionsIdOrLibraryRef,
        [FromQuery] string? language,
        [FromQuery] Dictionary<string, string> queryParams
    )
    {
        language ??= LanguageConst.Nb;
        var instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);
        AppOptions? appOptions;
        try
        {
            appOptions = await _appOptionsService.GetOptionsAsync(
                instanceIdentifier,
                optionsIdOrLibraryRef,
                language,
                queryParams
            );

            // Try to get non instance specific options if no instance options provider was found.
            if (appOptions?.Options == null)
            {
                appOptions = await _appOptionsService.GetOptionsAsync(optionsIdOrLibraryRef, language, queryParams);
            }
        }
        catch (HttpRequestException exception)
        {
            return Problem(
                statusCode: (int?)exception.StatusCode,
                title: $"Something went wrong while getting optionsIdOrLibraryRef: {optionsIdOrLibraryRef}",
                detail: exception.Message
            );
        }

        // Only return NotFound if we can't find an options provider.
        // If we find the options provider, but it doesnt' have values, return empty list.
        if (appOptions?.Options == null)
        {
            return NotFound();
        }

        HttpContext.Response.Headers.Append(
            "Altinn-DownstreamParameters",
            appOptions.Parameters.ToUrlEncodedNameValueString(',')
        );

        return Ok(appOptions.Options);
    }
}
