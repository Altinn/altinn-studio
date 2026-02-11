using Altinn.Studio.KubernetesWrapper.Models;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to kubernetes deployments
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="DeploymentsController"/> class
/// </remarks>
[Route("api/v1/[controller]")]
[ApiController]
public class DeploymentsController(IKubernetesApiWrapper apiWrapper) : ControllerBase
{
    /// <summary>
    /// Get a list of deployments. For a more detailed spec of parameters see Kubernetes API DOC
    /// </summary>
    /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything.</param>
    /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything.</param>
    /// <returns>A list of deployments in the cluster</returns>
    [HttpGet]
    [EnableCors]
    [ProducesResponseType(typeof(IReadOnlyList<Deployment>), StatusCodes.Status200OK, "application/json")]
    public async Task<ActionResult> GetDeployments(
        [FromQuery] string? labelSelector = null,
        [FromQuery] string? fieldSelector = null
    )
    {
        var deployments = await apiWrapper.GetDeployedResources(
            resourceType: ResourceType.Deployment,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector
        );
        return Ok(deployments);
    }
}
