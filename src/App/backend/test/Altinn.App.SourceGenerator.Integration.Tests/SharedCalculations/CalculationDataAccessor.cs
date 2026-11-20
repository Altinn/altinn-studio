using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.SourceGenerator.Integration.Tests.SharedCalculations;

/// <summary>
/// The form data of one instance for the shared calculation tests. Every data element is bound to the current task,
/// and its wrapper comes from <paramref name="createWrapper"/>, so a test chooses between the generated wrapper and
/// the reflection wrapper.
/// </summary>
internal sealed class CalculationDataAccessor(
    Instance instance,
    ITranslationService translationService,
    Func<object, DataType, DataElement, IFormDataWrapper> createWrapper
) : IInstanceDataAccessor
{
    private readonly Dictionary<string, object> _data = [];
    private readonly List<DataType> _dataTypes = [];

    public void Add(DataElement dataElement, object model)
    {
        if (_dataTypes.All(dataType => dataType.Id != dataElement.DataType))
        {
            _dataTypes.Add(
                new DataType
                {
                    Id = dataElement.DataType,
                    TaskIds = [TaskId],
                    AppLogic = new ApplicationLogic { ClassRef = model.GetType().FullName },
                    MaxCount = 1,
                }
            );
        }
        // This test double builds its own instance, which no mutator saves.
#pragma warning disable ALTINNAPP0503
        Instance.Data.Add(dataElement);
#pragma warning restore ALTINNAPP0503
        _data.Add(dataElement.Id, model);
    }

    public Instance Instance { get; } = instance;

    public string? Language => null;

    public string TaskId => Instance.Process.CurrentTask.ElementId;

    string? IInstanceDataAccessor.TaskId => TaskId;

    public IReadOnlyCollection<DataType> DataTypes => _dataTypes;

    public Task<object> GetFormData(DataElementIdentifier dataElementIdentifier) =>
        Task.FromResult(_data[dataElementIdentifier.Id]);

    public Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier)
    {
        var dataElement = GetDataElement(dataElementIdentifier);
        var dataType = _dataTypes.Single(dataType => dataType.Id == dataElement.DataType);
        return Task.FromResult(createWrapper(_data[dataElement.Id], dataType, dataElement));
    }

    public LayoutEvaluatorState GetLayoutEvaluatorState() =>
        new(this, null, translationService, new FrontEndSettings(), null, Language, TimeZoneInfo.Utc);

    public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier) =>
        Instance.Data.Find(dataElement => dataElement.Id == dataElementIdentifier.Id)
        ?? throw new InvalidOperationException($"Data element {dataElementIdentifier.Id} is not on the instance");

    public IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull) =>
        throw new NotSupportedException();

    public IInstanceDataAccessor GetPreviousDataAccessor() => throw new NotSupportedException();

    public Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier) =>
        throw new NotSupportedException();

    public void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method) =>
        throw new NotSupportedException();

    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides =>
        throw new NotSupportedException();
}
