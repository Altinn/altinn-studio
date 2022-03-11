using System;
using System.Collections.Generic;
using System.Linq;

using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Helper class for handling process related actions.
    /// </summary>
    public static class ProcessHelper
    {
        /// <summary>
        /// Maps an instance events related to process into process history items and sorts them in a list.
        /// </summary>
        /// <param name="events">List of instance events.</param>
        /// <returns>A list of process history items.</returns>
        public static List<ProcessHistoryItem> MapInstanceEventsToProcessHistory(List<InstanceEvent> events)
        {
            List<ProcessHistoryItem> history = new List<ProcessHistoryItem>();

            foreach (InstanceEvent instanceEvent in events)
            {
                switch (Enum.Parse(typeof(InstanceEventType), instanceEvent.EventType))
                {
                    case InstanceEventType.process_StartEvent:
                        history.Add(
                            new ProcessHistoryItem
                            {
                                Occured = instanceEvent.Created,
                                EventType = instanceEvent.EventType,
                                ElementId = instanceEvent.ProcessInfo.StartEvent,
                                PerformedBy = GetPerformedBy(instanceEvent.User)
                            });
                        break;
                    case InstanceEventType.process_EndEvent:
                        history.Add(
                              new ProcessHistoryItem
                              {
                                  Occured = instanceEvent.Created,
                                  EventType = instanceEvent.EventType,
                                  ElementId = instanceEvent.ProcessInfo.EndEvent,
                                  PerformedBy = GetPerformedBy(instanceEvent.User)
                              });
                        break;
                    case InstanceEventType.process_StartTask:
                        ProcessHistoryItem task_1 = history.FirstOrDefault(i => i.ElementId.Equals(instanceEvent.ProcessInfo.CurrentTask.ElementId));

                        if (task_1 != null)
                        {
                            task_1.Started = instanceEvent.Created;
                        }
                        else
                        {
                            history.Add(new ProcessHistoryItem
                            {
                                EventType = instanceEvent.EventType,
                                ElementId = instanceEvent.ProcessInfo.CurrentTask.ElementId,
                                Started = instanceEvent.Created,
                                PerformedBy = GetPerformedBy(instanceEvent.User)
                            });
                        }

                        break;
                    case InstanceEventType.process_EndTask:
                        ProcessHistoryItem task_2 = history.FirstOrDefault(i => i.ElementId.Equals(instanceEvent?.ProcessInfo?.CurrentTask?.ElementId));
                        if (task_2 != null)
                        {
                            task_2.Ended = instanceEvent.Created;
                        }
                        else
                        {
                            history.Add(new ProcessHistoryItem
                            {
                                EventType = instanceEvent.EventType,
                                ElementId = instanceEvent.ProcessInfo.CurrentTask.ElementId,
                                Ended = instanceEvent.Created,
                                PerformedBy = GetPerformedBy(instanceEvent.User)
                            });
                        }

                        break;
                }
            }

            return history;
        }

        private static string GetPerformedBy(PlatformUser user)
        {
            if (!string.IsNullOrEmpty(user.NationalIdentityNumber))
            {
                return user.NationalIdentityNumber;
            }
            else if (!string.IsNullOrEmpty(user.OrgId))
            {
                return user.OrgId;
            }

            return string.Empty;
        }
    }
}
