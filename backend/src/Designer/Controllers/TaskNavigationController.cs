using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Mappers;
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
    public class TaskNavigationController(ITaskNavigationService taskNavigationService) : ControllerBase
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
        public async Task<ActionResult<IEnumerable<TaskNavigationGroupDto>>> GetTaskNavigation(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            IEnumerable<TaskNavigationGroup> taskNavigationGroupList = await taskNavigationService.GetTaskNavigation(editingContext, cancellationToken);
            IEnumerable<App.Core.Internal.Process.Elements.ProcessTask> tasks = taskNavigationService.GetTasks(editingContext, cancellationToken);
            IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDto = taskNavigationGroupList.Select(taskNavigationGroup => taskNavigationGroup.ToDto((taskId) => tasks.FirstOrDefault(task => task.Id == taskId)?.ExtensionElements?.TaskExtension?.TaskType));

            return Ok(taskNavigationGroupDto);
        }
    }
}
