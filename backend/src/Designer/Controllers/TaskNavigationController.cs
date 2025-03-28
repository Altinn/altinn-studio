using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions that concerns task navigation
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/task-navigation")]
    public class TaskNavigationController(ITaskNavigationService taskNavigationService) : Controller
    {
        /// <summary>
        /// Get task navigation
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The list of task navigation groups</returns>
        [HttpGet]
        [UseSystemTextJson]
        public async Task<ActionResult<List<TaskNavigationGroupDto>>> GetTaskNavigation(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            List<TaskNavigationGroupDto> taskNavigationGroupList = await taskNavigationService.GetTaskNavigation(editingContext, cancellationToken);
            return Ok(taskNavigationGroupList);
        }

        /// <summary>
        /// Add new task navigation group
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="taskNavigationGroup">The new task navigation group.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpPut]
        [UseSystemTextJson]
        public async Task<IActionResult> AddTaskNavigationGroup(string org, string app, [FromBody] TaskNavigationGroupDto taskNavigationGroup, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            await taskNavigationService.AddTaskNavigationGroup(editingContext, taskNavigationGroup, cancellationToken);
            return NoContent();
        }
    }
}
