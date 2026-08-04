using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Root contract shared by every kind of service task. Do not implement this interface directly —
/// implement one of its kinds: <see cref="IServiceTask"/> for a task that does one thing, or
/// <see cref="IStagedServiceTask"/> for a task that does several things as a pipeline of steps.
/// The runtime resolves a task by <see cref="IProcessTask.Type"/> (matching the BPMN task type) and
/// dispatches on the kind it implements; a class registered against this root interface, or
/// implementing more than one kind, fails app startup validation.
/// </summary>
public interface IServiceTaskBase : IProcessTask, IProcessStepConfigurable { }
