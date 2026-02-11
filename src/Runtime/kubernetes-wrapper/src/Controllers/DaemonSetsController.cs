using Altinn.Studio.KubernetesWrapper.Models;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to kubernetes daemon set
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="DaemonSetsController"/> class
/// </remarks>
[Route("api/v1/[controller]")]
[ApiController]
public class DaemonSetsController(IKubernetesApiWrapper apiWrapper) : ControllerBase
{
    /// <summary>
    /// Get a list of daemonSets. For a more detailed spec of parameters see Kubernetes API DOC
    /// </summary>
    /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything.</param>
    /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything.</param>
    /// <returns>A list of daemonSets in the cluster</returns>
    [HttpGet]
    [EnableCors]
    [ProducesResponseType(typeof(IReadOnlyList<DaemonSet>), StatusCodes.Status200OK, "application/json")]
    public async Task<ActionResult> GetDaemonSets(
        [FromQuery] string? labelSelector = null,
        [FromQuery] string? fieldSelector = null
    )
    {
        var daemonSets = await apiWrapper.GetDeployedResources(
            resourceType: ResourceType.DaemonSet,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector
        );
        return Ok(daemonSets);
    }
}
