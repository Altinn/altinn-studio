using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models.modell1;
using Altinn.App.Models.modell2;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Actions;

public class RandomAction : IUserAction
{
    private readonly ILogger<RandomAction> _logger;
    private readonly Random _random;

    public RandomAction(ILogger<RandomAction> logger)
    {
        _logger = logger;
        _random = new Random();
    }

    public string Id => "random";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        _logger.LogInformation("RandomAction triggered");

        var dataElement1 = context.Instance.Data.FirstOrDefault(d => d.DataType == "modell1");
        var dataElement2 = context.Instance.Data.FirstOrDefault(d => d.DataType == "modell2");

        if (dataElement1 is null || dataElement2 is null)
        {
            throw new InvalidOperationException("Required data models not found on instance");
        }

        var data1Task = context.DataMutator.GetFormData((DataElementIdentifier)dataElement1);
        var data2Task = context.DataMutator.GetFormData((DataElementIdentifier)dataElement2);

        await Task.WhenAll(data1Task, data2Task);

        var data1 = (modell1)data1Task.Result;
        var data2 = (modell2)data2Task.Result;

        if (data2.shouldsucceed != "yes")
        {
            return UserActionResult.FailureResult(
                new ActionError()
                {
                    Code = "machine-readable-error-code",
                    Message = "Du må krysse av for vellykket",
                    Metadata = new Dictionary<string, string>() { { "key1", "value1" }, }
                }
            );
        }

        var newRandomNum = _random.Next();
        var newRandomChar = RandomString(12);

        data1.randomnum = newRandomNum;
        data2.randomchar = newRandomChar;

        return UserActionResult.SuccessResult();
    }

    private string RandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return new string(
            Enumerable.Repeat(chars, length).Select(s => s[_random.Next(s.Length)]).ToArray()
        );
    }
}
