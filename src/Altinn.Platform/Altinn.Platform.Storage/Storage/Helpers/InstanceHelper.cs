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
        public static List<MessageBoxInstance> ConvertToMessageBoxInstanceList(List<Instance> instances, Dictionary<string, Dictionary<string, string>> appTitles, string language)
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
                    LastChangedBy = FindLastChangedBy(instance),
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
        /// Converts to a simpler instance object that includes some application metadata
        /// </summary>
        public static MessageBoxInstance ConvertToMessageBoxInstance(Instance instance)
        {
            InstanceStatus status = instance.Status ?? new InstanceStatus();
            DateTime? visibleAfter = instance.VisibleAfter;

            string instanceGuid = instance.Id.Contains("/") ? instance.Id.Split("/")[1] : instance.Id;

            DateTime createdDateTime = visibleAfter != null && visibleAfter > instance.Created ? (DateTime)visibleAfter : instance.Created.Value;

            string lastChangedBy = FindLastChangedBy(instance);

            // last changed by is set to null if instance has only been modified by an organisation
            // to ensure correct rendering in messagebox.
            if (instance.Created.Value == instance.LastChanged.Value && IsValidOrganizationNumber(lastChangedBy))
            {
                lastChangedBy = "0";
            }

            MessageBoxInstance messageBoxInstance = new MessageBoxInstance
            {
                CreatedDateTime = createdDateTime,
                DueDateTime = instance.DueBefore,
                Id = instanceGuid,
                InstanceOwnerId = instance.InstanceOwner.PartyId,
                LastChangedBy = lastChangedBy,
                Org = instance.Org,
                AppName = instance.AppId.Split('/')[1],
                ProcessCurrentTask = GetSBLStatusForCurrentTask(instance),
                AllowNewCopy = false,
                DeletedDateTime = status.SoftDeleted,
                ArchivedDateTime = status.Archived,
                DeleteStatus = status.SoftDeleted.HasValue ? DeleteStatusType.SoftDeleted : DeleteStatusType.Default,
            };

            return messageBoxInstance;
        }

        /// <summary>
        /// Adds title to the intance
        /// </summary>
        public static List<MessageBoxInstance> AddTitleToInstances(List<MessageBoxInstance> instances, Dictionary<string, Dictionary<string, string>> appTitles, string language)
        {
            foreach (MessageBoxInstance instance in instances)
            {
                string title = appTitles[GetAppId(instance)].ContainsKey(language) ? appTitles[GetAppId(instance)][language] : appTitles[GetAppId(instance)]["nb"];
                instance.Title = title;
            }

            return instances;
        }

        /// <summary>
        /// Returns app id
        /// </summary>
        public static string GetAppId(MessageBoxInstance instance)
        {
            return instance.Org.ToLower() + "/" + instance.AppName;
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
                        User = instanceEvent.User,
                        CreatedDateTime = instanceEvent.Created,
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

        private static bool IsValidOrganizationNumber(string orgNo)
        {
            int[] weight = { 3, 2, 7, 6, 5, 4, 3, 2 };

            // Validation only done for 9 digit numbers
            if (orgNo.Length == 9)
            {
                try
                {
                    int currentDigit = 0;
                    int sum = 0;
                    for (int i = 0; i < orgNo.Length - 1; i++)
                    {
                        currentDigit = int.Parse(orgNo.Substring(i, 1));
                        sum += currentDigit * weight[i];
                    }

                    int ctrlDigit = 11 - (sum % 11);
                    if (ctrlDigit == 11)
                    {
                        ctrlDigit = 0;
                    }

                    return int.Parse(orgNo.Substring(orgNo.Length - 1)) == ctrlDigit;
                }
                catch
                {
                    return false;
                }
            }

            return false;
        }

        private static string FindLastChangedBy(Instance instance)
        {
            string result = instance.LastChangedBy;
            if (instance.Data == null || instance.Data.Count == 0)
            {
                return result;
            }

            List<DataElement> newerDataElements = instance.Data.FindAll(dataElement =>
                dataElement.LastChanged != null
                && dataElement.LastChangedBy != null
                && dataElement.LastChanged > instance.LastChanged);

            if (newerDataElements.Count == 0)
            {
                return result;
            }

            DateTime lastChanged = (DateTime)instance.LastChanged;
            newerDataElements.ForEach((DataElement dataElement) =>
            {
                if (dataElement.LastChanged > lastChanged)
                {
                    result = dataElement.LastChangedBy;
                    lastChanged = (DateTime)dataElement.LastChanged;
                }
            });

            return result;
        }
    }
}
