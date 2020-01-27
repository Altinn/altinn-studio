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
                                ElementId = instanceEvent.ProcessInfo.StartEvent
                            });
                        break;
                    case InstanceEventType.process_EndEvent:
                        history.Add(
                              new ProcessHistoryItem
                              {
                                  Occured = instanceEvent.Created,
                                  EventType = instanceEvent.EventType,
                                  ElementId = instanceEvent.ProcessInfo.EndEvent
                              });
                        break;
                    case InstanceEventType.process_StartTask:

                        // append data if element already in list
                        if (history.Any(i => i.ElementId.Equals(instanceEvent.ProcessInfo.CurrentTask.ElementId)))
                        {
                            history.Where(i => i.ElementId.Equals(instanceEvent.ProcessInfo.CurrentTask.ElementId))
                                .AsEnumerable().Select(i =>
                                {
                                    i.Started = instanceEvent.Created;
                                    return i;
                                });
                        }
                        else
                        {
                            history.Add(new ProcessHistoryItem
                            {
                                EventType = instanceEvent.EventType,
                                ElementId = instanceEvent.ProcessInfo.CurrentTask.ElementId,
                                Started = instanceEvent.Created
                            });
                        }

                        break;
                    case InstanceEventType.process_EndTask:

                        // append data if element already in list
                        if (history.Any(i => i.ElementId.Equals(instanceEvent?.ProcessInfo?.CurrentTask?.ElementId)))
                        {
                            history.Where(i => i.ElementId.Equals(instanceEvent.ProcessInfo.CurrentTask.ElementId))
                                .AsEnumerable().Select(i =>
                                {
                                    i.Ended = instanceEvent.Created;
                                    return i;
                                }).ToList();
                        }
                        else
                        {
                            history.Add(new ProcessHistoryItem
                            {
                                EventType = instanceEvent.EventType,
                                ElementId = instanceEvent.ProcessInfo.CurrentTask.ElementId,
                                Ended = instanceEvent.Created
                            });
                        }

                        break;
                }
            }

            return history;
        }
    }
}
