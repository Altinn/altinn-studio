using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for handling inbound events from the event system
/// </summary>
[Route("{org}/{app}/api/v1/eventsreceiver")]
public class EventsReceiverController : ControllerBase
{
    private readonly IEventHandlerResolver _eventHandlerResolver;
    private readonly ILogger _logger;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="EventsReceiverController"/> class.
    /// </summary>
    public EventsReceiverController(
        IEventHandlerResolver eventHandlerResolver,
        ILogger<EventsReceiverController> logger,
        IServiceProvider serviceProvider
    )
    {
        _eventHandlerResolver = eventHandlerResolver;
        _logger = logger;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Create a new inbound event for the app to process.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [ProducesResponseType(425)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> Post([FromQuery] string code, [FromBody] CloudEvent cloudEvent)
    {
        var secretCodeProvider = _appImplementationFactory.GetRequired<IEventSecretCodeProvider>();
        if (await secretCodeProvider.GetSecretCode() != code)
        {
            return Unauthorized();
        }

        if (cloudEvent.Type == null)
        {
            _logger.LogError(
                "CloudEvent.Type is null, unable to process event! Data received: {data}",
                JsonSerializer.Serialize(cloudEvent)
            );
            return BadRequest();
        }

        IEventHandler eventHandler = _eventHandlerResolver.ResolveEventHandler(cloudEvent.Type);
        try
        {
            bool eventSuccessfullyProcessed = await eventHandler.ProcessEvent(cloudEvent);

            // A return value of 425 will ensure the event system triggers the retry mecanism.
            // Actually any other return value than 200 Ok will do this, but this is the "correct way"
            // of saying we would like to be reminded again later.
            return eventSuccessfullyProcessed ? Ok() : new StatusCodeResult(425);
        }
        catch (NotImplementedException)
        {
            return BadRequest($"No eventhandler found that supports {cloudEvent.Type}");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unable to process event {eventType}. An exception was raised while processing message {messageid}. Exception thrown {exceptionMessage}",
                cloudEvent.Type,
                cloudEvent.Id,
                ex.Message
            );
            return new StatusCodeResult(500);
        }
    }
}
