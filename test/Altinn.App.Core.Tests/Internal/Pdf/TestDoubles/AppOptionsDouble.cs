using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.Pdf.TestDoubles;

public class AppOptionsDouble: IAppOptionsService
{
    public async Task<AppOptions> GetOptionsAsync(string optionId, string language, Dictionary<string, string> mappings)
    {
        List<AppOption> options = new List<AppOption>();
        if (mappings.IsNullOrEmpty())
        {
            options.Add(new AppOption()
            {
                Label = "no-mapping",
                Value = $"{optionId}-{language}"
            });
        }
        
        foreach (var pair in mappings)
        {
            options.Add(new AppOption()
            {
                Label = pair.Key,
                Value = $"{pair.Value}-{optionId}-{language}"
            });
        }

        return await Task.FromResult(new AppOptions()
        {
            Options = options,
            IsCacheable = false
        });
    }

    public async Task<AppOptions> GetOptionsAsync(InstanceIdentifier instanceIdentifier, string optionId, string language, Dictionary<string, string> keyValuePairs)
    {
        List<AppOption> options = new List<AppOption>();
        foreach (var pair in keyValuePairs)
        {
            options.Add(new AppOption()
            {
                Label = pair.Key,
                Value = $"{instanceIdentifier}-{pair.Value}-{optionId}-{language}"
            });
        }

        return await Task.FromResult(new AppOptions()
        {
            Options = options,
            IsCacheable = false
        });
    }
}