using System;
using System.Collections.Generic;
using System.Linq;

using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// This class is a collection of helper methods when working with InstanceEvents.
    /// </summary>
    public static class InstanceEventHelper
    {
        /// <summary>
        /// This method will remove duplicate events keeping the last of two or more events in a row.
        /// Duplicates are defined as two events of the same event type, triggered by the same
        /// user on the same resource.
        /// </summary>
        /// <param name="originalList">The original list of instance events.</param>
        /// <returns>A sorted and filtered list of instance events.</returns>
        public static List<InstanceEvent> RemoveDuplicateEvents(List<InstanceEvent> originalList)
        {
            foreach (InstanceEvent item in originalList.Where(ie => !string.IsNullOrEmpty(ie.DataId) && ie.EventType.Equals(InstanceEventType.Created.ToString())))
            {
                item.EventType = InstanceEventType.Saved.ToString();
            }

            List<InstanceEvent> orderedEnumerable =
                originalList
                    .Where(ie =>
                        string.IsNullOrEmpty(ie.DataId) ||
                        ie.EventType.Equals(
                            InstanceEventType.Saved.ToString(),
                            StringComparison.InvariantCultureIgnoreCase))
                    .OrderBy(ie => ie.Created).ToList();

            List<InstanceEvent> finalResult = new List<InstanceEvent>();

            for (int i = 0; i < orderedEnumerable.Count; i++)
            {
                InstanceEvent currentInstanceEvent = orderedEnumerable[i];

                InstanceEvent nextInstanceEvent =
                    i + 1 < orderedEnumerable.Count ? orderedEnumerable[i + 1] : null;

                if (nextInstanceEvent == null)
                {
                    // Last event should always be added.
                    finalResult.Add(currentInstanceEvent);
                    continue;
                }

                if (currentInstanceEvent.EventType != nextInstanceEvent.EventType)
                {
                    finalResult.Add(currentInstanceEvent);
                    continue;
                }

                string currentSubject = currentInstanceEvent.User?.UserId != null
                    ? currentInstanceEvent.User?.UserId.ToString()
                    : currentInstanceEvent.User?.OrgId;

                string nextSubject = nextInstanceEvent.User?.UserId != null
                    ? nextInstanceEvent.User?.UserId.ToString()
                    : nextInstanceEvent.User?.OrgId;

                if (currentSubject != nextSubject)
                {
                    // Events caused by different actors should be kept as separate events.
                    finalResult.Add(currentInstanceEvent);
                }
            }

            return finalResult;
        }
    }
}
