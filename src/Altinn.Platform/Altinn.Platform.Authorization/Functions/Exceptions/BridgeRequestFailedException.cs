using System;

namespace Altinn.Platform.Authorization.Functions.Exceptions;

/// <summary>
/// Generic exception used to trigger re-queueing of messages
/// </summary>
public class BridgeRequestFailedException : Exception
{
}
