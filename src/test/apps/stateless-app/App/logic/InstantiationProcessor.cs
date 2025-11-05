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
        /// <param name="prefill">External prefill available under instansiation if supplied</param>
        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            
            if (data.GetType() == typeof(MessageV1))
            {
                
                MessageV1 skjema = (MessageV1)data;
                
                string name = "";
                string num = "";
        
                if (prefill.ContainsKey("name"))
                {
                    name = prefill["name"];
                }
                if (prefill.ContainsKey("num"))
                {
                    num = prefill["num"];
                }
        
                skjema.Sender = name;
                skjema.Reference = num;
        
                if (prefill.ContainsKey("JobTitle"))
                {
                    skjema.PrefilledJobTitle = prefill["JobTitle"];
                }
                
            }
            
            await Task.CompletedTask;
        }
    }
}