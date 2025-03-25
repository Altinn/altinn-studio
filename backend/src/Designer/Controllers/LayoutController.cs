using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers
{
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app}/layouts/layoutSet/{layoutSetId}/")]
    [UseSystemTextJson]
    public class LayoutController(ILayoutService layoutService) : Controller
    {
        [EndpointSummary("Retrieve pages")]
        [ProducesResponseType<Models.Dto.Pages>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpGet("pages")]
        public async Task<ActionResult<Models.Dto.Pages>> GetPages(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            Models.Dto.Pages pages = await layoutService.GetPagesByLayoutSetId(
                editingContext,
                layoutSetId
            );
            return Ok(pages);
        }

        [EndpointSummary("Create page")]
        [ProducesResponseType<App.Core.Models.Pages>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [HttpPost("pages")]
        public async Task<ActionResult<Page>> CreatePage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromBody] Page page
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            Page existingPage = await layoutService.GetPageById(
                editingContext,
                layoutSetId,
                page.id
            );
            if (existingPage != null)
            {
                return Conflict();
            }
            await layoutService.CreatePage(editingContext, layoutSetId, page.id);
            return Created();
        }

        [EndpointSummary("Retrieve page")]
        [ProducesResponseType<Page>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpGet("pages/{pageId}")]
        [ProducesResponseType<Page>(StatusCodes.Status200OK)]
        public async Task<ActionResult<Page>> GetPage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            Page page = await layoutService.GetPageById(editingContext, layoutSetId, pageId);
            if (page == null)
            {
                return NotFound();
            }
            return Ok(page);
        }

        [EndpointSummary("Modify page")]
        [ProducesResponseType<Page>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpPut("pages/{pageId}")]
        public async Task<ActionResult<Page>> ModifyPage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId,
            [FromBody] Page page
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            Page existingPage = await layoutService.GetPageById(
                editingContext,
                layoutSetId,
                pageId
            );
            if (existingPage == null)
            {
                return NotFound();
            }

            await layoutService.UpdatePage(editingContext, layoutSetId, pageId, page);
            return Ok();
        }

        [EndpointSummary("Delete page")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpDelete("pages/{pageId}")]
        public async Task<ActionResult> DeletePage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            Page page = await layoutService.GetPageById(editingContext, layoutSetId, pageId);
            if (page == null)
            {
                return NotFound();
            }

            await layoutService.DeletePage(editingContext, layoutSetId, pageId);
            return Ok();
        }

        [EndpointSummary("Modify pages")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [HttpPut("pages")]
        public async Task<ActionResult> ModifyPages(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromBody] Models.Dto.Pages pages
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            await layoutService.UpdatePageOrder(editingContext, layoutSetId, pages);
            return Ok();
        }

        [EndpointSummary("Convert layout to use page groups")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [HttpPost("convert-to-pagegroups")]
        public async Task<ActionResult> ConvertToPageGroups(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            await layoutService.ConvertPagesToPageGroups(editingContext, layoutSetId);
            return Ok();
        }

        [EndpointSummary("Convert layout to use page order")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [HttpPost("convert-to-pageorder")]
        public async Task<ActionResult> ConvertToPageOrder(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            await layoutService.ConvertPageGroupsToPages(editingContext, layoutSetId);
            return Ok();
        }
    }
}
