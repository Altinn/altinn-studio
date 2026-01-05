namespace Altinn.App.ProcessEngine.Exceptions;

internal sealed class ProcessEngineCriticalException : ProcessEngineException
{
    public ProcessEngineCriticalException(string message)
        : base(message) { }
}
