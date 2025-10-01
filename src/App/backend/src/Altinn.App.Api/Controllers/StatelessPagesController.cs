#nullable disable
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Handles page related operations
/// </summary>
[ApiController]
[Route("{org}/{app}/v1/pages")]
[AllowAnonymous]
[Obsolete("IPageOrder does not work with frontend version 4")]
public class StatelessPagesController : ControllerBase
{
    private readonly IAppModel _appModel;
    private readonly IAppResources _resources;
    private readonly IPageOrder _pageOrder;

    /// <summary>
    /// Initializes a new instance of the <see cref="PagesController"/> class.
    /// </summary>
    /// <param name="appModel">The current appmodel implementation for getting the model Type</param>
    /// <param name="resources">The app resource service</param>
    /// <param name="pageOrder">The page order service</param>
    public StatelessPagesController(IAppModel appModel, IAppResources resources, IPageOrder pageOrder)
    {
        _appModel = appModel;
        _resources = resources;
        _pageOrder = pageOrder;
    }

    /// <summary>
    /// Get the page order based on the current state of the instance
    /// </summary>
    /// <returns>The pages sorted in the correct order</returns>
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [HttpPost("order")]
    public async Task<ActionResult<List<string>>> GetPageOrder(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] string layoutSetId,
        [FromQuery] string currentPage,
        [FromQuery] string dataTypeId,
        [FromBody] dynamic formData
    )
    {
        if (string.IsNullOrEmpty(dataTypeId))
        {
            return BadRequest($"Query parameter `{nameof(dataTypeId)}` must be defined");
        }

        string classRef = _resources.GetClassRefForLogicDataType(dataTypeId);

        object data = JsonConvert.DeserializeObject(formData.ToString(), _appModel.GetModelType(classRef));
        return await _pageOrder.GetPageOrder(
            new AppIdentifier(org, app),
            InstanceIdentifier.NoInstance,
            layoutSetId,
            currentPage,
            dataTypeId,
            data
        );
    }
}
