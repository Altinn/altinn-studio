using System.Net.Mime;
using System.Text.RegularExpressions;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// This controller class provides action methods for endpoints related to the tags resource on data elements.
/// </summary>
[ApiController]
[AutoValidateAntiforgeryTokenIfAuthCookie]
[Produces(MediaTypeNames.Application.Json)]
[Consumes(MediaTypeNames.Application.Json)]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/tags")]
public partial class DataTagsController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
    private readonly IDataClient _dataClient;
    private readonly IValidationService _validationService;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;

    /// <summary>
    /// Initialize a new instance of <see cref="DataTagsController"/> with the given services.
    /// </summary>
    /// <param name="instanceClient">A client that can be used to send instance requests to storage.</param>
    /// <param name="dataClient">A client that can be used to send data requests to storage.</param>
    /// <param name="validationService">Service for performing validations of user data</param>
    /// <param name="serviceProvider">A service provider to resolve internal services</param>
    public DataTagsController(
        IInstanceClient instanceClient,
        IDataClient dataClient,
        IValidationService validationService,
        IServiceProvider serviceProvider
    )
    {
        _instanceClient = instanceClient;
        _dataClient = dataClient;
        _validationService = validationService;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
    }

    /// <summary>
    /// Retrieves all tags associated with the given data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <returns>A <see cref="TagsList"/> object with a list of tags.</returns>
    [HttpGet]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(typeof(TagsList), StatusCodes.Status200OK)]
    public async Task<ActionResult<TagsList>> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance is null)
        {
            return Problem(
                title: "Instance not found",
                detail: "Unable to find instance based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        DataElement? dataElement = instance.Data.FirstOrDefault(m =>
            m.Id.Equals(dataGuid.ToString(), StringComparison.Ordinal)
        );

        if (dataElement is null)
        {
            return Problem(
                title: "Data element not found",
                detail: "Unable to find data element based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        TagsList tagsList = new() { Tags = dataElement.Tags };

        return tagsList;
    }

    /// <summary>
    /// Adds a new tag to a data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <param name="tag">The new tag to be added.</param>
    /// <returns>A <see cref="TagsList"/> object with a list of tags.</returns>
    [HttpPost]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [ProducesResponseType(typeof(TagsList), StatusCodes.Status201Created)]
    public async Task<ActionResult<TagsList>> Add(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromBody] string tag
    )
    {
        if (tag is null || !LettersRegex().Match(tag).Success)
        {
            return Problem(
                title: "Invalid tag name",
                detail: "Tags may only contain letters, '-' and '_'.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance is null)
        {
            return Problem(
                title: "Instance not found",
                detail: "Unable to find instance based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        DataElement? dataElement = instance.Data.FirstOrDefault(m =>
            m.Id.Equals(dataGuid.ToString(), StringComparison.Ordinal)
        );

        if (dataElement is null)
        {
            return Problem(
                title: "Data element not found",
                detail: "Unable to find data element based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        if (!dataElement.Tags.Contains(tag))
        {
            dataElement.Tags.Add(tag);
            dataElement = await _dataClient.Update(instance, dataElement);
        }

        TagsList tagsList = new() { Tags = dataElement.Tags };

        // There is no endpoint to GET a specific tag. Using the tags list endpoint.
        var routeValues = new
        {
            org,
            app,
            instanceOwnerPartyId,
            instanceGuid,
            dataGuid,
        };
        return CreatedAtAction(nameof(Get), routeValues, tagsList);
    }

    /// <summary>
    /// Removes a tag from a data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <param name="tag">The name of the tag to be removed.</param>
    [HttpDelete("{tag}")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> Delete(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromRoute] string tag
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance is null)
        {
            return Problem(
                title: "Instance not found",
                detail: "Unable to find instance based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        DataElement? dataElement = instance.Data.FirstOrDefault(m =>
            m.Id.Equals(dataGuid.ToString(), StringComparison.Ordinal)
        );

        if (dataElement is null)
        {
            return Problem(
                title: "Data element not found",
                detail: "Unable to find data element based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        if (dataElement.Tags.Remove(tag))
        {
            await _dataClient.Update(instance, dataElement);
        }

        return NoContent();
    }

    /// <summary>
    /// Sets a set of tags on a data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <param name="setTagsRequest">The request body.</param>
    /// <param name="ignoredValidators">comma separated string of validators to ignore. If missing we don't run validation.</param>
    /// <param name="language">The currently active user language.</param>
    [HttpPut]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [ProducesResponseType(typeof(SetTagsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SetTagsResponse>> SetTags(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromBody] SetTagsRequest setTagsRequest,
        [FromQuery] string? ignoredValidators = null,
        [FromQuery] string? language = null
    )
    {
        var tags = setTagsRequest.Tags;

        if (tags.Any(tag => string.IsNullOrWhiteSpace(tag) || !LettersRegex().IsMatch(tag)))
        {
            return Problem(
                title: "Invalid tag name",
                detail: "Tags may only contain letters, '-' and '_'.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance is null)
        {
            return Problem(
                title: "Instance not found",
                detail: "Unable to find instance based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        DataElement? dataElement = instance.Data.FirstOrDefault(it =>
            it.Id.Equals(dataGuid.ToString(), StringComparison.Ordinal)
        );

        if (dataElement is null)
        {
            return Problem(
                title: "Data element not found",
                detail: "Unable to find data element based on the given parameters.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        // Set dataElement tags to be the new tags
        dataElement.Tags = [.. tags.Distinct(StringComparer.Ordinal)];
        var updatedElement = await _dataClient.Update(instance, dataElement);
        if (updatedElement is null)
        {
            return Problem(
                title: "Data update failed",
                detail: $"Could not update data element {dataElement.Id} for instance {instance.Id}.",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        var validationIssues = await ValidateTags(instance, ignoredValidators, language);
        SetTagsResponse updateTagsResponse = new() { Tags = updatedElement.Tags, ValidationIssues = validationIssues };

        return Ok(updateTagsResponse);
    }

    private async Task<List<ValidationSourcePair>?> ValidateTags(
        Instance instance,
        string? ignoredValidatorsString,
        string? language
    )
    {
        var taskId = instance.Process.CurrentTask.ElementId;
        var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);
        var changes = dataAccessor.GetDataElementChanges(initializeAltinnRowId: true);

        List<ValidationSourcePair>? validationIssues = null;
        if (ignoredValidatorsString is not null)
        {
            var ignoredValidators = ignoredValidatorsString.Split(',').Where(v => !string.IsNullOrEmpty(v)).ToList();
            validationIssues = await _validationService.ValidateIncrementalFormData(
                dataAccessor,
                taskId,
                changes,
                ignoredValidators,
                language
            );
        }
        return validationIssues;
    }

    [GeneratedRegex("^[\\p{L}\\-_]+$")]
    private static partial Regex LettersRegex();
}
