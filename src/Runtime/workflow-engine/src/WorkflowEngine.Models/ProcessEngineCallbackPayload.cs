namespace WorkflowEngine.Models;

public sealed record ProcessEngineCallbackPayload(ProcessEngineActor ProcessEngineActor, string Metadata);
