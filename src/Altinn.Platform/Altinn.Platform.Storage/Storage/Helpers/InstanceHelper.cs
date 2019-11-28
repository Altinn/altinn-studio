using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// A helper clas to process instance objects
    /// </summary>
    public static class InstanceHelper
    {
        /// <summary>
        /// Initial task when an instance is instantiated
        /// </summary>
        public const string Task1 = "Task_1";

        /// <summary>
        /// Converts to a simpler instance object that includes some application metadata
        /// </summary>
        /// <param name="instances">List of instances to convert.</param>
        /// <param name="appTitles">Dictionary for application titles by language.</param>
        /// <param name="language">Desired language.</param>
        public static List<MessageBoxInstance> ConvertToMessageBoxInstance(List<Instance> instances, Dictionary<string, Dictionary<string, string>> appTitles, string language)
        {
            List<MessageBoxInstance> messageBoxInstances = new List<MessageBoxInstance>();
            if (instances == null || instances.Count == 0)
            {
                return messageBoxInstances;
            }

            foreach (Instance instance in instances)
            {
                InstanceStatus status = instance.Status ?? new InstanceStatus();
                DateTime? visibleAfter = instance.VisibleAfter;

                string title = appTitles[instance.AppId].ContainsKey(language) ? appTitles[instance.AppId][language] : appTitles[instance.AppId]["nb"];

                string instanceId = instance.Id.Contains("/") ? instance.Id.Split("/")[1] : instance.Id;

                DateTime createdDateTime = visibleAfter != null && visibleAfter > instance.Created ? (DateTime)visibleAfter : instance.Created.Value;

                messageBoxInstances.Add(new MessageBoxInstance
                {                    
                    CreatedDateTime = createdDateTime,
                    DueDateTime = instance.DueBefore,
                    Id = instanceId,
                    InstanceOwnerId = instance.InstanceOwner.PartyId,
                    LastChangedBy = instance.LastChangedBy,
                    Org = instance.Org,
                    AppName = instance.AppId.Split('/')[1],
                    Title = title,
                    ProcessCurrentTask = GetSBLStatusForCurrentTask(instance),
                    AuthorizedForWrite = true,
                    AllowDelete = true,
                    AllowNewCopy = false,
                    DeletedDateTime = status.SoftDeleted,
                    ArchivedDateTime = status.Archived,
                    DeleteStatus = status.SoftDeleted.HasValue ? DeleteStatusType.SoftDeleted : DeleteStatusType.Default,
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
                        UserId = instanceEvent.User.UserId,
                        CreatedDateTime = instanceEvent.Created,
                        EndUserSystemId = instanceEvent.User.EndUserSystemId,
                        EventType = instanceEvent.EventType
                    });
            }

            return simpleEvents;
        }

        /// <summary>
        /// Gets the equivalent sbl status for a given instance status
        /// </summary>
        /// <param name="instance">the instance</param>
        /// <returns>status</returns>
        public static string GetSBLStatusForCurrentTask(Instance instance)
        {
            if (instance.Process != null)
            {
                string currentTask = instance.Process.CurrentTask?.ElementId;
                if (currentTask != null && currentTask.Equals(Task1))
                {
                    return "FormFilling";
                }
                else if (string.IsNullOrEmpty(currentTask) && instance.Process.Ended != null && instance.Status?.Archived == null)
                {
                    return "Submit";
                }
                else if (string.IsNullOrEmpty(currentTask) && instance.Process.Ended != null && instance.Status?.Archived != null)
                {
                    return "Archived";
                }
                else
                {
                    return instance.Process.CurrentTask?.ElementId;
                }
            }
            else
            {
                return "default";
            }
        }
    }
}
