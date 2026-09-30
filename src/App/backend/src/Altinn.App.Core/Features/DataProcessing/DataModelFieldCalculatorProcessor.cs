using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.DataProcessing;

/// <summary>
/// Processing data model fields that is calculated by expressions provided in [modelName].calculation.json.
/// </summary>
internal sealed class DataModelFieldCalculatorProcessor : IDataWriteProcessor
{
    private readonly DataModelFieldCalculator _dataModelFieldCalculator;

    /// <summary>
    /// Initializes a new instance of the <see cref="DataModelFieldCalculatorProcessor"/> class.
    /// </summary>
    /// <param name="dataModelFieldCalculator"></param>
    public DataModelFieldCalculatorProcessor(DataModelFieldCalculator dataModelFieldCalculator)
    {
        _dataModelFieldCalculator = dataModelFieldCalculator;
    }

    /// <summary>
    /// Processes data write operations on properties in the data model.
    /// </summary>
    /// <param name="instanceDataMutator">Object to fetch data elements not included in changes</param>
    /// <param name="taskId">The current task ID</param>
    /// <param name="changes">Not used in this context</param>
    /// <param name="language">Not used in this context</param>
    public async Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        DataElementChanges changes,
        string? language
    )
    {
        await _dataModelFieldCalculator.Calculate(instanceDataMutator, taskId);
    }
}
