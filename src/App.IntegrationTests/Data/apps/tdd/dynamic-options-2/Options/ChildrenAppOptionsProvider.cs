using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Options
{
    internal class ChildrenAppOptionsProvider : IInstanceAppOptionsProvider
    {
        public string Id => "children";

        public Task<AppOptions> GetInstanceAppOptionsAsync(InstanceIdentifier instanceIdentifier, string language, Dictionary<string, string> keyValuePairs)
        {
            var appOptions = new AppOptions()
            {
                Options = new List<AppOption>()
                {
                    {
                        new AppOption()
                        {
                            Value = "1",
                            Label = "Ole"
                        }                        
                    },
                    {
                        new AppOption()
                        {
                            Value = "2",
                            Label = "Dole"
                        }
                    },
                    {
                        new AppOption()
                        {
                            Value = "3",
                            Label = "Doffen"
                        }
                    }
                }
            };

            return Task.FromResult(appOptions);
        }
    }
}
