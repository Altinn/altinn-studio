using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Altinn.App.Models; // Uncomment this line to refer to app model(s)

namespace Altinn.App.logic
{
    /// <summary>
    /// Represents a business logic class responsible for running logic related to instantiation.
    /// </summary>
    public class InstantiationProcessor: IInstantiationProcessor
    {
        /// <summary>
        /// Run events related to instantiation
        /// </summary>
        /// <remarks>
        /// For example custom prefill.
        /// </remarks>
        /// <param name="instance">Instance information</param>
        /// <param name="data">The data object created</param>
        /// <param name="prefill">External prefill available under instantiation if supplied</param>
        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
        {
            
            if (data.GetType() == typeof(MessageV1))
            {
                
                MessageV1 skjema = (MessageV1)data;

                // The runtime passes a null prefill dictionary whenever an instance is created
                // without external prefill, so "no prefill supplied" is a normal state here.
                string name = prefill?.GetValueOrDefault("name") ?? "";
                string num = prefill?.GetValueOrDefault("num") ?? "";

                skjema.Sender = name;
                skjema.Reference = num;

                if (prefill?.GetValueOrDefault("JobTitle") is { } jobTitle)
                {
                    skjema.PrefilledJobTitle = jobTitle;
                }
                
            }
            
            await Task.CompletedTask;
        }
    }
}