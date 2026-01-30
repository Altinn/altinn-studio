using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
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
        public static MessageBoxInstance ConvertToMessageBoxInstance(Instance instance)
        {
            InstanceStatus status = instance.Status ?? new InstanceStatus();
            DateTime? visibleAfter = instance.VisibleAfter;

            string instanceGuid = instance.Id.Contains("/") ? instance.Id.Split("/")[1] : instance.Id;

            DateTime createdDateTime = visibleAfter != null && visibleAfter > instance.Created ? (DateTime)visibleAfter : instance.Created.Value;

            MessageBoxInstance messageBoxInstance = new MessageBoxInstance
            {
                CreatedDateTime = createdDateTime,
                DueDateTime = instance.DueBefore,
                Id = instanceGuid,
                InstanceOwnerId = instance.InstanceOwner.PartyId,
                LastChangedBy = FindLastChanged(instance).LastChangedBy,
                Org = instance.Org,
                AppName = instance.AppId.Split('/')[1],
                ProcessCurrentTask = GetSBLStatusForCurrentTask(instance),
                AllowNewCopy = false,
                DeletedDateTime = status.SoftDeleted,
                ArchivedDateTime = status.Archived,
                DeleteStatus = status.SoftDeleted.HasValue ? DeleteStatusType.SoftDeleted : DeleteStatusType.Default,
                ReadStatus = status.ReadStatus
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
                if (instance.Process.Ended != null && instance.Status?.Archived == null)
                {
                    return "Submit";
                }
                else if (instance.Process.Ended != null && instance.Status?.Archived != null)
                {
                    return "Archived";
                }
                else
                {
                    return "FormFilling";
                }
            }
            else
            {
                return "default";
            }
        }

        /// <summary>
        /// Finds last changed by for an instance and its listed data elements
        /// </summary>
        /// <param name="instance">The instance</param>
        /// <returns>Last changed by</returns>
        public static (string LastChangedBy, DateTime? LastChanged) FindLastChanged(Instance instance)
        {
            string lastChangedBy = instance.LastChangedBy;
            DateTime? lastChanged = instance.LastChanged;
            if (instance.Data == null || instance.Data.Count == 0)
            {
                return (lastChangedBy, lastChanged);
            }

            List<DataElement> newerDataElements = instance.Data.FindAll(dataElement =>
                dataElement.LastChanged != null
                && dataElement.LastChangedBy != null
                && dataElement.LastChanged > instance.LastChanged);

            if (newerDataElements.Count == 0)
            {
                return (lastChangedBy, lastChanged);
            }

            lastChanged = (DateTime)instance.LastChanged;
            newerDataElements.ForEach((DataElement dataElement) =>
            {
                if (dataElement.LastChanged > lastChanged)
                {
                    lastChangedBy = dataElement.LastChangedBy;
                    lastChanged = (DateTime)dataElement.LastChanged;
                }
            });

            return (lastChangedBy, lastChanged);
        }

        /// <summary>
        /// Extracts instance owner type and value from a formatted instance owner identifier.
        /// </summary>
        /// <param name="instanceOwnerIdentifier">The instance owner identifier in format "type:value"</param>
        /// <returns>A tuple with the type and value</returns>
        public static (string InstanceOwnerIdType, string InstanceOwnerIdValue) GetIdentifierFromInstanceOwnerIdentifier(string instanceOwnerIdentifier)
        {
            if (string.IsNullOrEmpty(instanceOwnerIdentifier))
            {
                return (string.Empty, string.Empty);
            }

            string[] parts = instanceOwnerIdentifier.Replace(" ", string.Empty).ToLower().Split(':');
            if (parts.Length != 2)
            {
                return (string.Empty, string.Empty);
            }

            string partyType = parts[0];
            string partyNumber = parts[1];

            if (Enum.TryParse<PartyType>(partyType, true, out _))
            {
                return (partyType, partyNumber);
            }

            return (string.Empty, string.Empty);
        }

        /// <summary>
        /// Check if the instance is prevented from deletion based on application settings
        /// </summary>
        /// <param name="instanceStatus">The status of the instance to check</param>
        /// <param name="application">The application the instance belongs to</param>
        public static bool IsPreventedFromDeletion(InstanceStatus instanceStatus, Application application)
        {
            if (!instanceStatus.Archived.HasValue || !application.PreventInstanceDeletionForDays.HasValue)
            {
                return false;
            }

            DateTime archivedDateTime = instanceStatus.Archived.Value;
            DateTime dueDate = archivedDateTime.AddDays(application.PreventInstanceDeletionForDays.Value);

            return DateTime.UtcNow < dueDate;
        }
    }

    /// <summary>
    /// A helper class to validate instance owner ID with regular expression
    /// </summary>
    public static partial class InstanceOwnerIdRegExHelper
    {
        private static readonly Regex _elevenDigitRegex = new Regex(@"^\d{11}$", RegexOptions.Compiled, TimeSpan.FromMilliseconds(500));
        private static readonly Regex _nineDigitRegex = new Regex(@"^\d{9}$", RegexOptions.Compiled, TimeSpan.FromMilliseconds(500));

        public static Regex ElevenDigitRegex() => _elevenDigitRegex;
        public static Regex NineDigitRegex() => _nineDigitRegex;
    }
}
