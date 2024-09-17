using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;

namespace Altinn.App.Services;

public class ExternalApi : IExternalApiClient
{
    public string Id => "testId";

    public Task<object> GetExternalApiDataAsync(InstanceIdentifier instanceIdentifier, Dictionary<string, string> queryParams)
    {
        List<Detail> details = [new Detail { Id = "firstDetail", Info = "firstInfo" }, new Detail { Id = "secondDetail", Info = "secondInfo" }];
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine(details[0].Id);
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        Console.WriteLine("-------------------------------------------------");
        return Task.FromResult<object>(new ExternalApiModel { Id = "apiId", Details = details });
    }
}

public class ExternalApiModel
{
    public string Id { get; set; }
    public List<Detail> Details { get; set; }
}

public class Detail
{
    public string Id { get; set; }
    public string Info { get; set; }
}