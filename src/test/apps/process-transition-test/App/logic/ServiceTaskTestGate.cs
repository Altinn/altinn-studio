using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Logic;

/// <summary>
/// An external signal controlled by the browser tests. Each instance can be held independently,
/// and the pipeline defers until the test releases it after checking the waiting UI.
/// </summary>
internal static class ServiceTaskTestGate
{
    private static readonly ConcurrentDictionary<Guid, byte> _heldInstances = new();

    public static void Hold(Guid instanceGuid) => _heldInstances.TryAdd(instanceGuid, 0);

    public static void Release(Guid instanceGuid) => _heldInstances.TryRemove(instanceGuid, out _);

    public static bool IsHeld(Guid instanceGuid) => _heldInstances.ContainsKey(instanceGuid);
}

[ApiController]
[Authorize]
[Route("{org}/{app}/test/service-task-gates/{instanceGuid:guid}")]
public sealed class ServiceTaskTestGateController : ControllerBase
{
    [HttpPut]
    public IActionResult Hold(Guid instanceGuid)
    {
        ServiceTaskTestGate.Hold(instanceGuid);
        return NoContent();
    }

    [HttpDelete]
    public IActionResult Release(Guid instanceGuid)
    {
        ServiceTaskTestGate.Release(instanceGuid);
        return NoContent();
    }
}
