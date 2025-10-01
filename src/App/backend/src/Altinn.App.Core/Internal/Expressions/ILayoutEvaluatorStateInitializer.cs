using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Interface for initializing a <see cref="LayoutEvaluatorState" /> from dependency injection services
/// </summary>
public interface ILayoutEvaluatorStateInitializer
{
    /// <summary>
    /// Initialize a <see cref="LayoutEvaluatorState" /> with the given <see cref="Instance" /> and task id and optional gateway action and language
    ///
    /// The remaining data will be fetched from dependency injection services
    /// </summary>
    Task<LayoutEvaluatorState> Init(
        IInstanceDataAccessor dataAccessor,
        string? taskId,
        string? gatewayAction = null,
        string? language = null
    );
}
