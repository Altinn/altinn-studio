using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to feedback form
/// </summary>
[Authorize]
[ApiController]
[ValidateAntiForgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/feedbackform")]
public class FeedbackFormController: ControllerBase
{
    private readonly ISlackClient _slackClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="FeedbackFormController"/> class.
    /// </summary>
    /// <param name="slackClient">A http client to send messages to slack</param>
    public FeedbackFormController(ISlackClient slackClient)
    {
        _slackClient = slackClient;
    }

    /// <summary>
    /// Endpoint for submitting feedback
    /// </summary>
    [HttpPost]
    [Route("submit")]
    public async Task<IActionResult> SubmitFeedback([FromRoute] string org, [FromRoute] string app, [FromBody] FeedbackForm feedback)
    {
        if (feedback == null)
        {
            return BadRequest("Feedback object is null");
        }

        if (string.IsNullOrEmpty(feedback.Text))
        {
            return BadRequest("Feedback text is null or empty");
        }

        await _slackClient.SendMessage(new SlackRequest
        {
            Text = feedback.Text,
        });

        return Ok();
    }
}
