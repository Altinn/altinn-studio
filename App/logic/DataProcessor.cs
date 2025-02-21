using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Models.Model;

namespace Altinn.App.logic;

public class DataProcessor : IDataWriteProcessor
{
    public async Task ProcessDataWrite(IInstanceDataMutator instanceDataMutator, string taskId, DataElementChanges changes,
        string language)
    {
        var change = changes.FormDataChanges.FirstOrDefault(change => change.CurrentFormData is Model);
        if (change != null)
        {
            Model data = (Model)change.CurrentFormData;
            Model prev = (Model)change.PreviousFormData;
            await ProcessDates(instanceDataMutator, data, prev);
        }
    }

    private async Task ProcessDates(IInstanceDataMutator mutator, Model data, Model prev)
    {
        if (data.Dates?.SetDate != null && data.Dates.SetDate != prev?.Dates?.SetDate)
        {
            if (data.Dates.SetDate == "-")
            {
                data.Dates.SetDate = null;
                data.Dates.String = null;
                data.Dates.DateTime = null;
                data.Dates.DateOnly = null;
                data.Dates.FormatStringBackend = null;
                data.Dates.FormatDateTimeBackend = null;
                data.Dates.FormatDateOnlyBackend = null;
            }
            else
            {
                DateTime date = data.Dates.SetDate == "now"
                    ? DateTime.Now
                    : DateTime.Parse(data.Dates.SetDate);


                data.Dates.String = data.Dates.SetDate == "now"
                    ? date.ToString("o")
                    : data.Dates.SetDate;
                data.Dates.DateTime = date;
                data.Dates.DateOnly = new DateOnly(date.Year, date.Month, date.Day);

                data.Dates.FormatStringBackend = await FormatDateUsingExpression(mutator, data.Dates.String);
                data.Dates.FormatDateTimeBackend = await FormatDateUsingExpression(mutator, data.Dates.DateTime);
                data.Dates.FormatDateOnlyBackend = await FormatDateUsingExpression(mutator, data.Dates.DateOnly);
            }
        }
    }

    private async Task<string> FormatDateUsingExpression(IInstanceDataMutator mutator, object date)
    {
        try
        {
            string dateAsJson = System.Text.Json.JsonSerializer.Serialize(date);
            string dateAsString = System.Text.Json.JsonSerializer.Deserialize<string>(dateAsJson);

            LayoutEvaluatorState state = new LayoutEvaluatorState(mutator, null!, null!, null!, "nb", TimeZoneInfo.Local);
            List<Expression> args = new List<Expression> { new (dateAsString), new ("dd.MM.yyyy HH:mm:ss") };
            Expression expr = new Expression(ExpressionFunction.formatDate, args);
            var result = await ExpressionEvaluator.EvaluateExpression(state, expr, null!);

            if (result is string)
            {
                return result.ToString();
            }
            return System.Text.Json.JsonSerializer.Serialize(result);
        }
        catch(Exception error)
        {
            return error.Message;
        }
    }
}