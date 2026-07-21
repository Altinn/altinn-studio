namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Implemented by process handlers (service tasks and task/process lifecycle hooks) that want to
/// override the workflow engine's default execution timeout and/or retry strategy for the step that
/// runs them. This is the most specific tier in the resolution order:
/// <c>implementation override → command default → engine default</c>.
/// </summary>
/// <remarks>
/// The member is a default-interface-method returning <c>null</c>, so existing handlers keep the
/// engine defaults without any change. Override <see cref="StepOptions"/> to opt in.
/// </remarks>
public interface IProcessStepConfigurable
{
    /// <summary>
    /// Optional per-implementation step options. <c>null</c> (the default) means "no override" — the
    /// engine falls back to the command's default and then its own global default.
    /// </summary>
    ProcessStepOptions? StepOptions => null;
}
