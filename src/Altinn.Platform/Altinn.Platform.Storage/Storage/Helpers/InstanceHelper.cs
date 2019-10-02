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
                    CreatedDateTime = (instance.VisibleDateTime != null && instance.VisibleDateTime > instance.CreatedDateTime) ? (DateTime)instance.VisibleDateTime : instance.CreatedDateTime,
                    DueDateTime = instance.DueDateTime,
                    Id = instance.Id.Contains("/") ? instance.Id.Split("/")[1] : instance.Id,
                    InstanceOwnerId = instance.InstanceOwnerId,
                    LastChangedBy = instance.LastChangedBy,
                    Org = instance.Org,
                    AppName = instance.AppId.Split('/')[1],
                    Title = appTitles[instance.AppId].ContainsKey(language) ? appTitles[instance.AppId][language] : appTitles[instance.AppId]["nb"],
                    ProcessCurrentTask = instance.Process?.CurrentTask?.ElementId,
                    AuthorizedForWrite = true,
                    AllowDelete = true,
                    AllowNewCopy = false,
                    DeletedDateTime = instance.InstanceState.DeletedDateTime,
                    ArchivedDateTime = instance.InstanceState.ArchivedDateTime,
                    DeleteStatus = instance.InstanceState.IsDeleted ? DeleteStatusType.SoftDeleted : DeleteStatusType.Default,
                });
            }

            return messageBoxInstances;
        }

        /// <summary>
        /// Converts list of instance events to a list of simplified sbl instance events
        /// </summary>
        /// <param name="instanceEvents">List of instance events to convert.</param>
        public static List<SblInstanceEvent> ConvertToSBLInstanceEvent(List<InstanceEvent> instanceEvents)
        {
            List<SblInstanceEvent> simpleEvents = new List<SblInstanceEvent>();
            foreach (InstanceEvent instanceEvent in instanceEvents)
            {
                simpleEvents.Add(
                    new SblInstanceEvent()
                    {
                        Id = instanceEvent.Id,
                        UserId = instanceEvent.UserId,
                        CreatedDateTime = instanceEvent.CreatedDateTime,
                        EndUserSystemId = instanceEvent.EndUserSystemId,
                        EventType = instanceEvent.EventType
                    });
            }

            return simpleEvents;
        }
    }
}
