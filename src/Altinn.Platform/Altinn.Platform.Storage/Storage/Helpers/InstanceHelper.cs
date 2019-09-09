using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// A helper clas to process instance objects
    /// </summary>
    public static class InstanceHelper
    {
        /// <summary>
        /// Converts to a simpler instance object that includes some application metadata
        /// </summary>
        /// <param name="instances">List of instances to convert.</param>
        /// <param name="appTitles">Dictionary for application titles by language.</param>
        /// <param name="language">Desired language.</param>
        public static List<MessageBoxInstance> ConvertToMessageBoxInstance(List<Instance> instances, Dictionary<string, Dictionary<string, string>> appTitles, string language)
        {
            List<MessageBoxInstance> messageBoxInstances = new List<MessageBoxInstance>();

            foreach (Instance instance in instances)
            {
                messageBoxInstances.Add(new MessageBoxInstance()
                {
                    CreatedDateTime = instance.CreatedDateTime,
                    DueDateTime = instance.DueDateTime,
                    Id = instance.Id.Contains("/") ? instance.Id.Split("/")[1] : instance.Id,
                    InstanceOwnerId = instance.InstanceOwnerId,
                    LastChangedBy = instance.LastChangedBy,
                    Org = instance.Org,
                    AppName = instance.AppId.Split('/')[1],
                    Title = appTitles[instance.AppId].ContainsKey(language) ? appTitles[instance.AppId][language] : appTitles[instance.AppId]["nb"],
                    ProcessCurrentTask = instance.Process.CurrentTask,
                    AuthorizedForWrite = true,
                    AllowDelete = true,
                    AllowNewCopy = false,
                    DeleteStatus = instance.InstanceState.IsDeleted ? DeleteStatusType.SoftDeleted : DeleteStatusType.Default,
                });
            }

            return messageBoxInstances;
        }
    }
}
