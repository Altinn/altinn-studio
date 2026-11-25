using System.Globalization;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.App.Models;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;
#nullable enable
namespace Altinn.App.Logic.ConvertedLegacyRules;
public class AllocationDataProcessor(ILogger<AllocationDataProcessor> logger) : IDataProcessor, IDataWriteProcessor
{
    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language)
    {
        if (data is NestedGroup model)
            Calculate(model);
        return Task.CompletedTask;
    }
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language) => Task.CompletedTask;
    public Task ProcessDataWrite(IInstanceDataMutator instanceDataMutator, string taskId, DataElementChanges changes, string? language)
    {
        foreach (var change in changes.FormDataChanges)
            if (change.Type == ChangeType.Created && change.CurrentFormData is NestedGroup model)
                Calculate(model);
        return Task.CompletedTask;
    }
    // Converted from legacy JavaScript calculation rules. Review the code and test the app.
    private void Calculate(NestedGroup model)
    {
        Run("AllocationHelper", () => model.AllocationHelper = AllocationHelper(model));
    }
    // A legacy rule that failed wrote nothing, so a failing rule keeps the current value.
    private void Run(string field, Action rule)
    {
        try
        {
            rule();
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Converted legacy rule for {Field} failed", field);
        }
    }

    // Rule allocation (allocation): categories = AllocationCategories, Feed = FeedAllocation, Compost = CompostAllocation -> AllocationHelper
    // (function(obj) {
    //     if (!obj.categories) return '100|false';
    //     var selected = obj.categories.split(',');
    //     var sum = 0;
    //     var complete = selected.length > 0;
    //     selected.forEach(function(category) {
    //         var value = obj[category];
    //         sum += +value;
    //         if (value == null) complete = false;
    //     });
    //     return `${100 - sum}|${complete && sum !== 100}`;
    // })
    private static string? AllocationHelper(NestedGroup model)
    {
        var fields = new Dictionary<string, decimal?>
        {
            ["Feed"] = model.FeedAllocation,
            ["Compost"] = model.CompostAllocation,
        };
        if (string.IsNullOrEmpty(model.AllocationCategories))
        {
            return "100|false";
        }
        string[] selected = (model.AllocationCategories ?? "").Split(",", StringSplitOptions.RemoveEmptyEntries);
        decimal sum = 0;
        bool complete = selected.Length > 0;
        foreach (var category in selected)
        {
            decimal? value = fields.GetValueOrDefault(category);
            sum += value ?? 0;
            if (value is null)
            {
                complete = false;
            }
        }
        return string.Create(CultureInfo.InvariantCulture, $"{(100 - sum)}|{((complete && sum != 100) ? "true" : "false")}");
    }
}
