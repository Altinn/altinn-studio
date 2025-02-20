using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Models.Model;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic
{

    public class DataProcessor : IDataProcessor
    {
        public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
        {
            return Task.CompletedTask;
        }

        public async Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)
        {
            if (data.GetType() == typeof(Model))
            {
                Model model = (Model)data;
                Model prev = (Model)previousData;

                if (model.Dates?.SetDate != null && model.Dates.SetDate != prev?.Dates?.SetDate)
                {
                    if (model.Dates.SetDate == "-")
                    {
                        model.Dates.SetDate = null;
                        model.Dates.String = null;
                        model.Dates.DateTime = null;
                        model.Dates.DateOnly = null;
                        model.Dates.FormatStringBackend = null;
                        model.Dates.FormatDateTimeBackend = null;
                        model.Dates.FormatDateOnlyBackend = null;
                    }
                    else
                    {
                        DateTime date = model.Dates.SetDate == "now"
                            ? DateTime.Now
                            : DateTime.Parse(model.Dates.SetDate);


                        model.Dates.String = model.Dates.SetDate == "now"
                            ? date.ToString("o")
                            : model.Dates.SetDate;
                        model.Dates.DateTime = date;
                        model.Dates.DateOnly = date.Date;

                        model.Dates.FormatStringBackend = await FormatDateUsingExpression(model.Dates.String);
                        model.Dates.FormatDateTimeBackend = await FormatDateUsingExpression(model.Dates.DateTime);
                        model.Dates.FormatDateOnlyBackend = await FormatDateUsingExpression(model.Dates.DateOnly);
                    }
                }
            }

            await Task.CompletedTask;
        }

        private async Task<string> FormatDateUsingExpression(object date)
        {
            try
            {
                Instance instance = new Instance();
                instance.Data = new List<DataElement>();
                IInstanceDataAccessor dataAccessor = new InstanceDataAccessorFake(instance);
                LayoutEvaluatorState state = new LayoutEvaluatorState(dataAccessor, null!, null!, null!, "nb", TimeZoneInfo.Local);
                string dateStrIso = date switch
                {
                    DateTime dt => dt.ToString("o"),
                    DateOnly d => d.ToString("o"),
                    string str => str,
                    _ => throw new ArgumentException("Invalid date format")
                };
                List<Expression> args = new List<Expression> { new (dateStrIso), new ("dd.MM.yyyy HH:mm:ss") };
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

    public class InstanceDataAccessorFake : IInstanceDataAccessor
    {
        public Instance Instance { get; }

        public InstanceDataAccessorFake(Instance instance)
        {
            Instance = instance;
        }

        public Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
        {
            return Task.FromResult(new object());
        }

        public Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
        {
            return Task.FromResult(ReadOnlyMemory<byte>.Empty);
        }

        public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
        {
            return new DataElement();
        }

        public DataType GetDataType(string dataTypeId)
        {
            return null;
        }
    }

}
