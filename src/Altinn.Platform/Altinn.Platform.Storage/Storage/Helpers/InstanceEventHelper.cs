using System;
using System.Collections.Generic;
using System.Linq;

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
            List<InstanceEvent> orderedEnumerable = originalList.OrderBy(ie => ie.Created).ToList();

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

                bool sameEvent = false;

                DateTime currentDateTime = currentInstanceEvent.Created ?? DateTime.UtcNow.AddMilliseconds(-1);
                DateTime nextDateTime = nextInstanceEvent.Created ?? DateTime.UtcNow;

                if (nextDateTime - currentDateTime > TimeSpan.FromSeconds(1))
                {
                    if (currentInstanceEvent.EventType == "Created" && nextInstanceEvent.EventType == "Saved")
                    {
                        sameEvent = true;
                    }
                }

                if (!sameEvent && currentInstanceEvent.EventType != nextInstanceEvent.EventType)
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
                    continue;
                }

                if (currentInstanceEvent.DataId != nextInstanceEvent.DataId)
                {
                    // Events related to different data elements or instance should be separate events.
                    finalResult.Add(currentInstanceEvent);
                    continue;
                }
            }

            return finalResult;
        }
    }
}
