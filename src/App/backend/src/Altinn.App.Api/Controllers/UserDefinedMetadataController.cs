using System.Net.Mime;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// This controller class provides action methods for endpoints related to the metadata resource on data elements.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[Consumes(MediaTypeNames.Application.Json)]
[Route(
    "{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/user-defined-metadata"
)]
public class UserDefinedMetadataController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    /// <summary>
    /// Initialize a new instance of <see cref="UserDefinedMetadataController"/> with the given services.
    /// </summary>
    /// <param name="instanceClient">A client that can be used to send instance requests to storage.</param>
    /// <param name="dataClient">A client that can be used to send data requests to storage.</param>
    /// <param name="appMetadata">The app metadata service</param>
    /// <param name="authenticationContext">The authentication context service</param>
    /// <param name="serviceProvider">The service provider</param>
    public UserDefinedMetadataController(
        IInstanceClient instanceClient,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider
    )
    {
        _instanceClient = instanceClient;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _authenticationContext = authenticationContext;
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
    }

    /// <summary>
    /// Retrieves user defined metadata associated with the given data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <returns>A <see cref="UserDefinedMetadataDto"/> object with a list of key value entries.</returns>
    [HttpGet]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(typeof(UserDefinedMetadataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserDefinedMetadataDto>> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        DataElement? dataElement = instance.Data.Find(m =>
            m.Id.Equals(dataGuid.ToString(), StringComparison.OrdinalIgnoreCase)
        );

        if (dataElement is null)
        {
            return NotFound("Unable to find data element based on the given parameters.");
        }

        UserDefinedMetadataDto userDefinedMetadataDto = new() { UserDefinedMetadata = dataElement.UserDefinedMetadata };

        return userDefinedMetadataDto;
    }

    /// <summary>
    /// Update user defined metadata associated with the given data element.
    /// </summary>
    /// <param name="org">The short name for the application owner.</param>
    /// <param name="app">The name of the application.</param>
    /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
    /// <param name="instanceGuid">The id of the instance.</param>
    /// <param name="dataGuid">The id of the data element.</param>
    /// <param name="userDefinedMetadataDto">Object with a list of properties.</param>
    /// <returns>A <see cref="UserDefinedMetadataDto"/> object with a list of key value entries.</returns>
    [HttpPut]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
    [ProducesResponseType(typeof(UserDefinedMetadataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserDefinedMetadataDto>> Update(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromBody] UserDefinedMetadataDto userDefinedMetadataDto
    )
    {
        List<string> duplicatedKeys = userDefinedMetadataDto
            .UserDefinedMetadata.GroupBy(entry => entry.Key)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicatedKeys.Count > 0)
        {
            return BadRequest($"The following keys are duplicated: {string.Join(", ", duplicatedKeys)}");
        }

        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        DataElement? dataElement = instance.Data.Find(m =>
            m.Id.Equals(dataGuid.ToString(), StringComparison.OrdinalIgnoreCase)
        );

        if (dataElement is null)
        {
            return NotFound("Unable to find data element based on the given parameters.");
        }

        Application application = await _appMetadata.GetApplicationMetadata();
        DataType? dataTypeFromMetadata = application.DataTypes.First(e =>
            e.Id.Equals(dataElement.DataType, StringComparison.OrdinalIgnoreCase)
        );

        if (dataTypeFromMetadata is null)
        {
            throw new ApplicationConfigException(
                $"Element type {dataElement.DataType} not allowed for instance {instanceOwnerPartyId}/{instanceGuid}, but is the used data type for data element {dataElement.Id}. Please check the app metadata for allowed data types for this instance."
            );
        }

        if (
            await _dataElementAccessChecker.GetUpdateProblem(
                instance,
                dataTypeFromMetadata,
                _authenticationContext.Current
            ) is
            { } problem
        )
        {
            return StatusCode(problem.Status ?? 500, problem);
        }

        List<string> notAllowedKeys = FindNotAllowedKeys(userDefinedMetadataDto, dataTypeFromMetadata);
        if (notAllowedKeys.Count > 0)
        {
            return BadRequest($"The following keys are not allowed: {string.Join(", ", notAllowedKeys)}");
        }

        dataElement.UserDefinedMetadata = userDefinedMetadataDto.UserDefinedMetadata;
        dataElement = await _dataClient.Update(instance, dataElement);

        UserDefinedMetadataDto responseUserDefinedMetadataDto = new()
        {
            UserDefinedMetadata = dataElement.UserDefinedMetadata,
        };

        return responseUserDefinedMetadataDto;
    }

    private static List<string> FindNotAllowedKeys(
        UserDefinedMetadataDto userDefinedMetadataDto,
        DataType dataTypeFromMetadata
    )
    {
        List<string> invalidKeys = [];

        if (dataTypeFromMetadata.AllowedKeysForUserDefinedMetadata is { Count: > 0 })
        {
            invalidKeys = userDefinedMetadataDto
                .UserDefinedMetadata.Select(entry => entry.Key)
                .Where(key => !dataTypeFromMetadata.AllowedKeysForUserDefinedMetadata.Contains(key))
                .ToList();
        }

        return invalidKeys;
    }
}
