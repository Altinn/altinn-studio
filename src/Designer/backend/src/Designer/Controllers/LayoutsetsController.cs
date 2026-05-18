using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/layoutsets")]
public class LayoutsetsController : Controller
{
    private readonly ILayoutsetsService _layoutsetsService;

    public LayoutsetsController(ILayoutsetsService layoutsetsService)
    {
        _layoutsetsService = layoutsetsService;
    }

    [HttpGet("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalValidationOnNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        ValidationOnNavigation config = await _layoutsetsService.GetGlobalValidationOnNavigationSettings(
            editingContext,
            cancellationToken
        );
        return Ok(config);
    }

    [HttpPost("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> SaveGlobalValidationOnNavigationSettings(
        string org,
        string app,
        [FromBody] ValidationOnNavigation config,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        await _layoutsetsService.SaveGlobalValidationOnNavigationSettings(editingContext, config, cancellationToken);
        return Ok();
    }

    [HttpDelete("settings/validation-on-navigation")]
    public async Task<IActionResult> DeleteGlobalValidationOnNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        await _layoutsetsService.SaveGlobalValidationOnNavigationSettings(editingContext, null, cancellationToken);
        return Ok();
    }

    [HttpGet("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalTaskNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        var result = await _layoutsetsService.GetGlobalTaskNavigationSettings(editingContext, cancellationToken);
        return Ok(result);
    }

    [HttpPost("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> UpdateGlobalTaskNavigationSettings(
        string org,
        string app,
        [FromBody] IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            await _layoutsetsService.UpdateGlobalTaskNavigationSettings(
                editingContext,
                taskNavigationGroupDtoList,
                cancellationToken
            );
            return NoContent();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
    }
}
