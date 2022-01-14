using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Common.Process.Elements;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// The app implementation of the process service.
    /// </summary>
    public class ProcessAppSI : IProcess
    {
        private readonly AppSettings _appSettings;
        private readonly ILogger<ProcessAppSI> _logger;
        private readonly IInstanceEvent _instanceEventClient;
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Gets the internal ProcessHelper instance
        /// </summary>
        public ProcessHelper ProcessHelper { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="ProcessAppSI"/> class.
        /// </summary>
        public ProcessAppSI(
            IOptions<PlatformSettings> platformSettings,
            IOptions<AppSettings> appSettings,
            IInstanceEvent instanceEventClient,
            ILogger<ProcessAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient)
        {
            _appSettings = appSettings.Value;
            _instanceEventClient = instanceEventClient;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            ProcessHelper = new ProcessHelper(GetProcessDefinition());
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
            _client = httpClient;
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinition()
        {
            string bpmnFilePath = _appSettings.AppBasePath + _appSettings.ConfigurationFolder + _appSettings.ProcessFolder + _appSettings.ProcessFileName;

            try
            {
                Stream processModel = File.OpenRead(bpmnFilePath);

                return processModel;
            }
            catch (Exception processDefinitionException)
            {
                _logger.LogError($"Cannot find process definition file for this app. Have tried file location {bpmnFilePath}. Exception {processDefinitionException}");
                throw;
            }
        }

        /// <summary>
        /// Does not save process. Instance is updated.
        /// </summary>
        public ProcessStateChange ProcessStart(Instance instance, string proposedStartEvent, ClaimsPrincipal user)
        {
            if (instance.Process == null)
            {
                DateTime now = DateTime.UtcNow;

                string validStartEvent = CheckStartEvent(instance, proposedStartEvent);

                ProcessState startState = new ProcessState
                {
                    Started = now,
                    StartEvent = validStartEvent,
                    CurrentTask = new ProcessElementInfo { Flow = 1 }
                };

                instance.Process = startState;

                List<InstanceEvent> events = new List<InstanceEvent>
                {
                    GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now, user),
                };

                return new ProcessStateChange
                {
                    OldProcessState = null,
                    NewProcessState = startState,
                    Events = events,
                };
            }

            return null;
        }

        /// <summary>
        /// Start process start and goto next. Returns
        /// </summary>
        public ProcessStateChange ProcessStartAndGotoNextTask(Instance instance, string proposedStartEvent, ClaimsPrincipal user)
        {
            _logger.LogInformation($"ProcessStartAndGotoNextTask for {instance.Id}");

            // start process
            ProcessStateChange startChange = ProcessStart(instance, proposedStartEvent, user);
            InstanceEvent startEvent = CopyInstanceEventValue(startChange.Events.First());

            // move next
            string nextValidElement = GetNextElement(instance.Process.StartEvent);
            ProcessStateChange nextChange = ProcessNext(instance, nextValidElement, user);
            InstanceEvent goToNextEvent = CopyInstanceEventValue(nextChange.Events.First());

            ProcessStateChange processStateChange = new ProcessStateChange
            {
                OldProcessState = startChange.OldProcessState,
                NewProcessState = nextChange.NewProcessState,
                Events = new List<InstanceEvent> { startEvent, goToNextEvent }
            };

            return processStateChange;
        }

        /// <summary>
        /// Moves instance's process to nextElement id. Returns the instance together with process events.
        /// </summary>
        public ProcessStateChange ProcessNext(Instance instance, string nextElementId, ClaimsPrincipal userContext)
        {
            if (instance.Process != null)
            {
                try
                {
                    string validNextEmentId = CheckNextElementId(instance, nextElementId);

                    ProcessStateChange result = new ProcessStateChange
                    {
                        OldProcessState = new ProcessState()
                        {
                            Started = instance.Process.Started,
                            CurrentTask = instance.Process.CurrentTask,
                            StartEvent = instance.Process.StartEvent
                        }
                    };

                    result.Events = MoveProcessToNext(instance, validNextEmentId, userContext);
                    result.NewProcessState = instance.Process;
                    return result;
                }
                catch
                {
                    _logger.LogError($"Unable to get next for {instance.Id}");
                }
            }

            return null;
        }
        
        /// <inheritdoc />
        public async Task<ProcessHistoryList> GetProcessHistory(string instanceGuid, string instanceOwnerPartyId)
        {
            string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/process/history";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _appSettings.RuntimeCookieName);

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                ProcessHistoryList processHistoryList = JsonConvert.DeserializeObject<ProcessHistoryList>(eventData);

                return processHistoryList;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        private string GetNextElement(string proposedStartEvent)
        {
            // find next task
            string nextValidElement = ProcessHelper.GetValidNextElementOrError(proposedStartEvent, out ProcessError nextElementError);
            if (nextElementError != null)
            {
                throw new ArgumentException($"Unable to goto next element due to {nextElementError.Code} - {nextElementError.Text}");
            }

            return nextValidElement;
        }

        private string CheckStartEvent(Instance instance, string proposedStartEvent)
        {
            string validStartEvent = ProcessHelper.GetValidStartEventOrError(proposedStartEvent, out ProcessError startEventError);
            if (startEventError != null)
            {
                throw new ArgumentException($"Start event {validStartEvent} is not valid for this an instance of {instance.AppId}");
            }

            return validStartEvent;
        }

        private string CheckNextElementId(Instance instance, string proposedNextElementId)
        {
            string currentElementId = instance.Process?.CurrentTask?.ElementId ?? instance.Process?.StartEvent;
            if (currentElementId == null)
            {
                throw new ArgumentException("Process has not started");
            }

            if (instance.Process?.EndEvent != null)
            {
                throw new ArgumentException("Process has ended. Cannot do next");
            }

            string validNextElementId = ProcessHelper.GetValidNextElementOrError(currentElementId, proposedNextElementId, out ProcessError nextElementError);

            if (nextElementError != null)
            {
                throw new ArgumentException($"Wanted next element id {proposedNextElementId} is not a possible move from {currentElementId} in process model. {nextElementError.Text}");
            }

            return validNextElementId;
        }

        /// <inheritdoc />
        public async Task DispatchProcessEventsToStorage(Instance instance, List<InstanceEvent> events)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            foreach (InstanceEvent instanceEvent in events)
            {
                instanceEvent.InstanceId = instance.Id;
                await _instanceEventClient.SaveInstanceEvent(instanceEvent, org, app);
            }
        }

        /// <summary>
        /// Assumes that nextElementId is a valid task/state
        /// </summary>
        private List<InstanceEvent> MoveProcessToNext(
            Instance instance,
            string nextElementId,
            ClaimsPrincipal user)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            ProcessState previousState = JsonConvert.DeserializeObject<ProcessState>(JsonConvert.SerializeObject(instance.Process));
            ProcessState currentState = instance.Process;
            string previousElementId = currentState.CurrentTask?.ElementId;

            ElementInfo nextElementInfo = ProcessHelper.Process.GetElementInfo(nextElementId);

            DateTime now = DateTime.UtcNow;

            // ending previous element if task
            if (ProcessHelper.IsTask(previousElementId))
            {
                instance.Process = previousState;
                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_EndTask.ToString(), instance, now, user));
                instance.Process = currentState;
            }

            // ending process if next element is end event
            if (ProcessHelper.IsEndEvent(nextElementId))
            {
                currentState.CurrentTask = null;
                currentState.Ended = now;
                currentState.EndEvent = nextElementId;

                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now, user));

                // add submit event (to support Altinn2 SBL)
                events.Add(GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
            }
            else if (ProcessHelper.IsTask(nextElementId))
            {
                currentState.CurrentTask = new ProcessElementInfo
                {
                    Flow = currentState.CurrentTask.Flow + 1,
                    ElementId = nextElementId,
                    Name = nextElementInfo.Name,
                    Started = now,
                    AltinnTaskType = nextElementInfo.AltinnTaskType,
                    Validated = null,
                };

                events.Add(GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user));
            }

            // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
            instance.Process = currentState;

            return events;
        }

        private InstanceEvent CopyInstanceEventValue(InstanceEvent e)
        {
            return new InstanceEvent
            {
                Created = e.Created,
                DataId = e.DataId,
                EventType = e.EventType,
                Id = e.Id,
                InstanceId = e.InstanceId,
                InstanceOwnerPartyId = e.InstanceOwnerPartyId,
                ProcessInfo = new ProcessState
                {
                    Started = e.ProcessInfo?.Started,
                    CurrentTask = new ProcessElementInfo
                    {
                        Flow = e.ProcessInfo?.CurrentTask.Flow,
                        AltinnTaskType = e.ProcessInfo?.CurrentTask.AltinnTaskType,
                        ElementId = e.ProcessInfo?.CurrentTask.ElementId,
                        Name = e.ProcessInfo?.CurrentTask.Name,
                        Started = e.ProcessInfo?.CurrentTask.Started,
                        Ended = e.ProcessInfo?.CurrentTask.Ended,
                        Validated = new ValidationStatus
                        {
                            CanCompleteTask = e.ProcessInfo?.CurrentTask?.Validated?.CanCompleteTask ?? false,
                            Timestamp = e.ProcessInfo?.CurrentTask?.Validated?.Timestamp
                        }
                    },

                    StartEvent = e.ProcessInfo?.StartEvent
                },
                User = new PlatformUser
                {
                    AuthenticationLevel = e.User.AuthenticationLevel,
                    EndUserSystemId = e.User.EndUserSystemId,
                    OrgId = e.User.OrgId,
                    UserId = e.User.UserId
                }
            };
        }

        private InstanceEvent GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, ClaimsPrincipal user)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                InstanceId = instance.Id,
                InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                EventType = eventType,
                Created = now,
                User = new PlatformUser
                {
                    UserId = user.GetUserIdAsInt(),
                    AuthenticationLevel = user.GetAuthenticationLevel(),
                    OrgId = user.GetOrg()
                },
                ProcessInfo = instance.Process,
            };

            return instanceEvent;
        }
    }
}
