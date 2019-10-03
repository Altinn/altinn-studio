namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Text;
    using System.Threading.Tasks;
    using System.Web;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using AltinnCore.ServiceLibrary.Models;
    using global::Storage.Interface.Enums;
    using global::Storage.Interface.Models;
    using Halcyon.HAL;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Http.Extensions;
    using Microsoft.AspNetCore.Http.Features;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.WebUtilities;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Microsoft.Extensions.Primitives;
    using Microsoft.Net.Http.Headers;
    using Newtonsoft.Json;

    /// <summary>
    /// Handles operations for the application instance resource
    /// </summary>
    [Route("storage/api/v1/instances")]
    [ApiController]
    public class InstancesController : ControllerBase
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IInstanceEventRepository _instanceEventRepository;
        private readonly IApplicationRepository _applicationRepository;
        private readonly IDataRepository _dataRepository;
        private readonly ILogger logger;
        private static readonly FormOptions _defaultFormOptions = new FormOptions();
        private readonly HttpClient bridgeRegistryClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstancesController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        /// <param name="instanceEventRepository">the instance event repository service</param>        
        /// <param name="applicationRepository">the application repository handler</param>
        /// <param name="dataRepository">the data repository handler</param>
        /// <param name="generalSettings">the platform settings which has the url to the registry</param>
        /// <param name="logger">the logger</param>
        /// <param name="bridgeClient">the client to call bridge service</param>
        public InstancesController(
            IInstanceRepository instanceRepository,
            IInstanceEventRepository instanceEventRepository,
            IApplicationRepository applicationRepository,
            IDataRepository dataRepository,
            IOptions<GeneralSettings> generalSettings,
            ILogger<InstancesController> logger,
            HttpClient bridgeClient)
        {
            _instanceRepository = instanceRepository;
            _instanceEventRepository = instanceEventRepository;
            _applicationRepository = applicationRepository;
            _dataRepository = dataRepository;
            this.logger = logger;
            this.bridgeRegistryClient = bridgeClient;

            string bridgeUri = generalSettings.Value.GetBridgeRegisterApiEndpoint();
            if (bridgeUri != null)
            {
                this.bridgeRegistryClient.BaseAddress = new Uri(bridgeUri);
            }
        }

        /// <summary>
        /// Gets all instances for a given instance owner.
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>list of instances</returns>
        [HttpGet("{instanceOwnerId:int}")]
        public async Task<ActionResult> GetInstanceOwners(int instanceOwnerId)
        {
            List<Instance> result = await _instanceRepository.GetInstancesOfInstanceOwner(instanceOwnerId);
            if (result == null || result.Count == 0)
            {
                return NotFound($"Did not find any instances for instanceOwnerId={instanceOwnerId}");
            }

            result.ForEach(i => AddSelfLinks(Request, i));

            return Ok(result);
        }

        /// <summary>
        /// Get all instances for a given org or appId. Only one parameter at the time.
        /// </summary>
        /// <param name="org">application owner</param>
        /// <param name="appId">application id</param>
        /// <param name="currentTaskId">running process current task id</param>
        /// <param name="processIsComplete">is process complete</param>
        /// <param name="processIsInError">is process in error</param>
        /// <param name="processEndState">process end state</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <param name="labels">labels</param>
        /// <param name="lastChangedDateTime">last changed date</param>
        /// <param name="createdDateTime">created time</param>
        /// <param name="visibleDateTime">the visible date time</param>
        /// <param name="dueDateTime">the due date time</param>
        /// <param name="continuationToken">continuation token</param>
        /// <param name="size">the page size</param>
        /// <returns>list of all instances for given instanceowner</returns>
        /// <!-- GET /instances?org=tdd or GET /instances?appId=tdd/app2 -->
        [HttpGet]
        public async Task<ActionResult> GetInstances(
            string org,
            string appId,
            [FromQuery(Name = "process.currentTask")] string currentTaskId,
            [FromQuery(Name = "process.isComplete")] bool? processIsComplete,
            [FromQuery(Name = "process.isInError")] bool? processIsInError,
            [FromQuery(Name = "process.endState")] string processEndState,
            [FromQuery] int? instanceOwnerId,
            [FromQuery] string labels,
            [FromQuery] string lastChangedDateTime,
            [FromQuery] string createdDateTime,
            [FromQuery] string visibleDateTime,
            [FromQuery] string dueDateTime,
            string continuationToken,
            int? size)
        {
            int pageSize = size ?? 100;
            string selfContinuationToken = null;

            if (!string.IsNullOrEmpty(continuationToken))
            {
                selfContinuationToken = continuationToken;
                continuationToken = HttpUtility.UrlDecode(continuationToken);
            }

            Dictionary<string, StringValues> queryParams = QueryHelpers.ParseQuery(Request.QueryString.Value);

            string host = $"{Request.Scheme}://{Request.Host.ToUriComponent()}";
            string url = Request.Path;
            string query = Request.QueryString.Value;

            logger.LogInformation($"uri = {url}{query}");

            try
            {
                InstanceQueryResponse result = await _instanceRepository.GetInstancesOfApplication(queryParams, continuationToken, pageSize);

                if (result.TotalHits == 0)
                {
                    return NotFound($"Did not find any instances");
                }

                if (!string.IsNullOrEmpty(result.Exception))
                {
                    return BadRequest(result.Exception);
                }

                string nextContinuationToken = HttpUtility.UrlEncode(result.ContinuationToken);
                result.ContinuationToken = null;

                HALResponse response = new HALResponse(result);

                if (continuationToken == null)
                {
                    string selfUrl = $"{host}{url}{query}";

                    result.Self = selfUrl;

                    Link selfLink = new Link("self", selfUrl);
                    response.AddLinks(selfLink);
                }
                else
                {
                    string selfQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        selfContinuationToken);

                    string selfUrl = $"{host}{url}{selfQueryString}";

                    result.Self = selfUrl;

                    Link selfLink = new Link("self", selfUrl);
                    response.AddLinks(selfLink);
                }

                if (nextContinuationToken != null)
                {
                    string nextQueryString = BuildQueryStringWithOneReplacedParameter(
                        queryParams,
                        "continuationToken",
                        nextContinuationToken);

                    string nextUrl = $"{host}{url}{nextQueryString}";

                    result.Next = nextUrl;

                    Link nextLink = new Link("next", nextUrl);
                    response.AddLinks(nextLink);
                }

                // add self links to platform
                result.Instances.ForEach(i => AddSelfLinks(Request, i));

                StringValues acceptHeader = Request.Headers["Accept"];
                if (acceptHeader.Any() && acceptHeader.Contains("application/hal+json"))
                {
                    /* Response object should be expressed as HAL (Hypertext Application Language) with _embedded and _links.
                     * Thus we reset the response object's inline instances, next and self elements.*/

                    response.AddEmbeddedCollection("instances", result.Instances);
                    result.Instances = null;
                    result.Next = null;
                    result.Self = null;
                }

                return Ok(response);
            }
            catch (Exception e)
            {
                logger.LogError("exception", e);
                return StatusCode(500, $"Unable to perform query due to: {e.Message}");
            }
        }

        /// <summary>
        ///   Annotate instance with self links to platform for the instance and each of its data elements.
        /// </summary>
        /// <param name="request">the http request which has the path to the request</param>
        /// <param name="instance">the instance to annotate</param>
        public static void AddSelfLinks(HttpRequest request, Instance instance)
        {
            string selfLink = $"{request.Scheme}://{request.Host.ToUriComponent()}{request.Path}";

            int start = selfLink.IndexOf("/instances");
            selfLink = selfLink.Substring(0, start) + "/instances";

            selfLink += $"/{instance.Id}";

            instance.SelfLinks = instance.SelfLinks ?? new ResourceLinks();
            instance.SelfLinks.Platform = selfLink;

            if (instance.Data != null)
            {
                foreach (DataElement dataElement in instance.Data)
                {
                    dataElement.DataLinks = dataElement.DataLinks ?? new ResourceLinks();

                    dataElement.DataLinks.Platform = $"{selfLink}/data/{dataElement.Id}";
                }
            }
        }

        private static string BuildQueryStringWithOneReplacedParameter(Dictionary<string, StringValues> q, string queryParamName, string newParamValue)
        {
            List<KeyValuePair<string, string>> items = q.SelectMany(
                x => x.Value,
                (col, value) => new KeyValuePair<string, string>(col.Key, value))
                .ToList();

            items.RemoveAll(x => x.Key == queryParamName);

            var qb = new QueryBuilder(items)
                        {
                            { queryParamName, newParamValue }
                        };

            string nextQueryString = qb.ToQueryString().Value;

            return nextQueryString;
        }

        /// <summary>
        /// Gets an instance for a given instance id.
        /// </summary>
        /// <param name="instanceOwnerId">instance owner id.</param>
        /// <param name="instanceGuid">the guid of the instance.</param>
        /// <returns>an instance.</returns>
        [HttpGet("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Get(int instanceOwnerId, Guid instanceGuid)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance result;
            try
            {
                result = await _instanceRepository.GetOne(instanceId, instanceOwnerId);

                AddSelfLinks(Request, result);

                return Ok(result);
            }
            catch (Exception e)
            {
                return NotFound($"Unable to find instance {instanceId}: {e}");
            }
        }

        /// <summary>
        /// Inserts new instance into the instance collection.
        /// </summary>
        /// <param name="appId">the application id</param>
        /// <param name="instanceOwnerId">instance owner id</param>
        /// <returns>instance object</returns>
        /// <!-- POST /instances?appId={appId}&instanceOwnerId={instanceOwnerId} -->
        [HttpPost]
        [DisableFormValueModelBinding]
        [Consumes("application/json", otherContentTypes: new string[] { "multipart/form-data" })]
        [Produces("application/json")]
        public async Task<ActionResult> Post(string appId, int? instanceOwnerId)
        {
            // check if metadata exists
            Application appInfo = GetApplicationOrError(appId, out ActionResult appInfoError);
            if (appInfoError != null)
            {
                return appInfoError;
            }

            List<Part> parts = ReadAndCheckContent(Request, appInfo, out ActionResult contentError);
            if (contentError != null)
            {
                return contentError;
            }

            // extract instance template. it should, if it exists, be first part in list
            Instance instanceTemplate = await ExtractInstanceTemplateFromParts(parts);

            // get instanceOwnerId from one out of three possible places
            int ownerId = GetOrLookupInstanceOwnerId(instanceOwnerId, instanceTemplate, out ActionResult instanceOwnerIdError);
            if (instanceOwnerIdError != null)
            {
                return instanceOwnerIdError;
            }

            if (instanceTemplate == null)
            {
                instanceTemplate = new Instance();
            }

            Instance storedInstance = null;

            try
            {
                DateTime creationTime = DateTime.UtcNow;
                string userId = null;

                Instance instanceToCreate = CreateInstanceFromTemplate(appInfo, instanceTemplate, ownerId, creationTime, userId);
                storedInstance = await _instanceRepository.Create(instanceToCreate);
                await DispatchEvent(InstanceEventType.Created.ToString(), storedInstance);
                logger.LogInformation($"Created instance: {storedInstance.Id}");

                if (parts.Any())
                {
                    storedInstance = await SaveDataElementsAndUpdateInstance(parts, storedInstance, creationTime, userId);
                }

                AddSelfLinks(Request, storedInstance);

                return Ok(storedInstance);
            }
            catch (Exception storageException)
            {
                logger.LogError($"Unable to create {appId} instance for {ownerId} due to {storageException}");

                // compensating action - delete instance
                await _instanceRepository.Delete(storedInstance);
                logger.LogError($"Deleted instance {storedInstance.Id}");

                return StatusCode(500, $"Unable to create {appId} instance for {ownerId} due to {storageException.Message}");
            }
        }

        private async Task<Instance> SaveDataElementsAndUpdateInstance(List<Part> parts, Instance storedInstance, DateTime creationTime, string userId)
        {
            try
            {
                foreach (Part part in parts)
                {
                    // Create a new DataElement to be stored in blob and added in the Data List of the Instance object.
                    DataElement newDataElement = DataElementHelper.CreateDataElement(part.Name, storedInstance, creationTime, part.ContentType, part.FileName, part.Stream.Length, userId);

                    // Store file as blob.
                    newDataElement.FileSize = _dataRepository.WriteDataToStorage(part.Stream, newDataElement.StorageUrl).Result;

                    if (newDataElement.FileSize > 0)
                    {
                        storedInstance.Data.Add(newDataElement);

                        logger.LogInformation($"Data element '{newDataElement.ElementType} - {newDataElement.Id}' is stored at {newDataElement.StorageUrl}, file size {newDataElement.FileSize / 1024}KB");
                    }
                }

                // Update instance with the data element.
                storedInstance = _instanceRepository.Update(storedInstance).Result;
            }
            catch (Exception dataElementException)
            {
                // compensating action - delete blobs
                logger.LogError($"Creation of data elements failed. {dataElementException}");

                foreach (DataElement dataElement in storedInstance.Data)
                {
                    await _dataRepository.DeleteDataInStorage(dataElement.StorageUrl);
                    logger.LogError($"Deleted data element '{dataElement.ElementType} - {dataElement.Id}' stored at {dataElement.StorageUrl}");
                }

                throw;
            }

            return storedInstance;
        }

        private async Task<Instance> ExtractInstanceTemplateFromParts(List<Part> parts)
        {
            Instance instanceTemplate = null;

            if (parts.Any() && parts[0] != null && parts[0].Name != null && parts[0].Name.Equals("instance"))
            {
                Part instancePart = parts[0];

                instanceTemplate = JsonConvert.DeserializeObject<Instance>(await StreamToUtf8String(instancePart.Stream));

                parts.Remove(instancePart);
            }

            return instanceTemplate;
        }

        private Instance CreateInstanceFromTemplate(Application appInfo, Instance instanceTemplate, int ownerId, DateTime creationTime, string userId)
        {
            Instance createdInstance = new Instance()
            {
                InstanceOwnerId = ownerId.ToString(),
                CreatedBy = userId,
                CreatedDateTime = creationTime,
                LastChangedBy = userId,
                LastChangedDateTime = creationTime,
                AppId = appInfo.Id,
                Org = appInfo.Org,
                VisibleDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.VisibleDateTime),
                DueDateTime = DateTimeHelper.ConvertToUniversalTime(instanceTemplate.DueDateTime),
                Labels = instanceTemplate.Labels,
                PresentationField = instanceTemplate.PresentationField,
                InstanceState = new InstanceState { IsArchived = false, IsDeleted = false, IsMarkedForHardDelete = false },
            };

            // copy applications title to presentation field if not set by instance template
            if (createdInstance.PresentationField == null && appInfo.Title != null)
            {
                LanguageString presentation = new LanguageString();

                foreach (KeyValuePair<string, string> title in appInfo.Title)
                {
                    presentation.Add(title.Key, title.Value);
                }

                createdInstance.PresentationField = presentation;
            }

            createdInstance.Data = new List<DataElement>();

            createdInstance.Process = instanceTemplate.Process;

            return createdInstance;
        }

        /// <summary>
        /// Method to read the parts of of a multipart request body.
        /// </summary>
        /// <param name="request">The HttpRequest</param>
        /// <param name="appInfo">The application metadata</param>
        /// <param name="errorResult">The error message if the part does not follow the application metadata or has a proper section name, ...</param>
        /// <returns>The list of the parts in the multpart request</returns>
        private List<Part> ReadAndCheckContent(HttpRequest request, Application appInfo, out ActionResult errorResult)
        {
            errorResult = null;

            List<Part> emptyList = Enumerable.Empty<Part>().ToList();

            if (MultipartRequestHelper.IsMultipartContentType(request.ContentType))
            {
                List<Part> parts = ReadMultipartContentOrError(request, appInfo, out ActionResult multipartError);

                if (multipartError != null)
                {
                    errorResult = multipartError;
                    return emptyList;
                }

                return parts;
            }
            else
            {
                Part part = ReadInstanceTemplatePart(request.ContentType, request.Body, out ActionResult instanceTemplateError);

                if (instanceTemplateError != null)
                {
                    errorResult = instanceTemplateError;
                }

                if (part != null)
                {
                    return new List<Part>() { part };
                }
            }

            return emptyList;
        }

        private Part ReadInstanceTemplatePart(string contentType, Stream stream, out ActionResult errorResult)
        {
            errorResult = null;

            if (!string.IsNullOrEmpty(contentType))
            {
                if (contentType.StartsWith("application/json"))
                {
                    return new Part()
                    {
                        ContentType = contentType,
                        Name = "instance",
                        Stream = CopyStreamIntoMemoryStream(stream),
                    };
                }
                else
                {
                    errorResult = BadRequest($"Unexpected Content-Type '{contentType}' of embedded instance template. Expecting 'application/json'");
                    return null;
                }
            }

            return null;
        }

        private List<Part> ReadMultipartContentOrError(HttpRequest request, Application appInfo, out ActionResult errorResult)
        {
            errorResult = null;

            List<Part> parts = new List<Part>();
            List<Part> emptyList = Enumerable.Empty<Part>().ToList();

            MediaTypeHeaderValue mediaType = MediaTypeHeaderValue.Parse(request.ContentType);
            string boundary = MultipartRequestHelper.GetBoundary(mediaType, _defaultFormOptions.MultipartBoundaryLengthLimit);

            MultipartReader reader = new MultipartReader(boundary, request.Body);
            MultipartSection section = reader.ReadNextSectionAsync().Result;

            while (section != null)
            {
                Part part = ReadSectionIntoPartOrError(section, appInfo, out ActionResult sectionError);

                if (sectionError != null)
                {
                    errorResult = sectionError;
                    return emptyList;
                }

                if (part != null)
                {
                    parts.Add(part);
                }

                section = reader.ReadNextSectionAsync().Result;
            }

            return parts;
        }

        /// <summary>
        /// Reads a multipart section, checks if it meets criteria of Application metadata and returns a part holding the stream with content.
        /// </summary>
        /// <param name="section">the section to read</param>
        /// <param name="appInfo">the application metadata</param>
        /// <param name="errorResult">error message</param>
        /// <returns>the part holding the section's stream</returns>
        private Part ReadSectionIntoPartOrError(MultipartSection section, Application appInfo, out ActionResult errorResult)
        {
            errorResult = null;

            bool hasContentDispositionHeader = ContentDispositionHeaderValue
                   .TryParse(section.ContentDisposition, out ContentDispositionHeaderValue contentDisposition);

            if (!hasContentDispositionHeader)
            {
                errorResult = BadRequest("Multipart section must have content disposition header");
                return null;
            }

            if (!contentDisposition.Name.HasValue)
            {
                errorResult = BadRequest("Multipart section has no name. It must have a name that corresponds to elementTypes defined in Application metadat");
                return null;
            }

            string sectionName = contentDisposition.Name.Value;
            string contentType = section.ContentType;

            if (sectionName.Equals("instance"))
            {
                Part part = ReadInstanceTemplatePart(contentType, section.Body, out ActionResult instanceTemplateError);

                if (instanceTemplateError != null)
                {
                    errorResult = instanceTemplateError;
                    return null;
                }

                if (part != null)
                {
                    return part;
                }
            }
            else
            {
                // Check if the section name is declared for the application (e.g. "default").
                ElementType elementType = appInfo.ElementTypes.Find(e => e.Id == sectionName);

                if (elementType == null)
                {
                    errorResult = BadRequest($"Multipart section named, '{sectionName}' does not correspond to an element type in application metadata");
                    return null;
                }

                if (section.ContentType == null)
                {
                    errorResult = BadRequest($"The multipart section named {sectionName} is missing Content-Type.");
                    return null;
                }

                string contentTypeWithoutEncoding = contentType.Split(";")[0];

                // Check if the content type of the multipart section is declared for the element type (e.g. "application/xml").
                if (!elementType.AllowedContentType.Contains(contentTypeWithoutEncoding))
                {
                    errorResult = BadRequest($"The multipart section named {sectionName} has a Content-Type '{contentType}' which is not declared in this application element type '{elementType}'");
                    return null;
                }

                string contentFileName = contentDisposition.FileName.HasValue ? contentDisposition.FileName.Value : null;
                long fileSize = contentDisposition.Size ?? 0;

                // copy the section.Body stream since this stream cannot be rewind
                MemoryStream memoryStream = CopyStreamIntoMemoryStream(section.Body);

                if (memoryStream.Length == 0)
                {
                    errorResult = BadRequest($"The multpart section named {sectionName} has no data. Cannot process empty part.");
                    return null;
                }

                return new Part()
                {
                    ContentType = contentType,
                    Name = sectionName,
                    Stream = memoryStream,
                    FileName = contentFileName,
                    FileSize = fileSize,
                };
            }

            return null;
        }

        private MemoryStream CopyStreamIntoMemoryStream(Stream stream)
        {
            MemoryStream memoryStream = new MemoryStream();
            stream.CopyTo(memoryStream);
            memoryStream.Position = 0;

            return memoryStream;
        }

        /// <summary>
        /// Reads the body element of HttpRequest as string
        /// </summary>
        /// <returns></returns>
        private async Task<string> StreamToUtf8String(Stream stream)
        {
            StreamReader streamReader = new StreamReader(stream, Encoding.UTF8);
            return await streamReader.ReadToEndAsync();
        }

        private Application GetApplicationOrError(string appId, out ActionResult errorResult)
        {
            errorResult = null;
            Application appInfo = null;

            try
            {
                string org = appId.Split("/")[0];

                appInfo = _applicationRepository.FindOne(appId, org).Result;
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    errorResult = NotFound($"Did not find application with appId={appId}");
                }
                else
                {
                    errorResult = StatusCode(500, $"Document database error: {dce}");
                }
            }
            catch (Exception e)
            {
                errorResult = StatusCode(500, $"Unable to perform request: {e}");
            }

            return appInfo;
        }

        /// <summary>
        /// InstanceOwner can be given in three different ways:
        ///  - instanceOwnerId is provided as query param (priority1),
        ///  - in instanceTemplate.instanceOwnerId (priority2),
        ///  - or instanceTemplate.instanceOwnerLookup (priority3)
        /// </summary>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceTemplate">the instance template</param>
        /// <param name="errorResult">the errorResult. null if successful otherwise an action result</param>
        /// <returns></returns>
        private int GetOrLookupInstanceOwnerId(int? instanceOwnerId, Instance instanceTemplate, out ActionResult errorResult)
        {
            errorResult = null;

            if (instanceOwnerId.HasValue)
            {
                return instanceOwnerId.Value;
            }
            else
            {
                if (instanceTemplate != null)
                {
                    if (!string.IsNullOrEmpty(instanceTemplate.InstanceOwnerId))
                    {
                        return int.Parse(instanceTemplate.InstanceOwnerId);
                    }
                    else
                    {
                        return InstanceOwnerLookup(instanceTemplate.InstanceOwnerLookup, ref errorResult);
                    }
                }
                else
                {
                    errorResult = BadRequest("InstanceOwnerId must be set, either in query param or attached in instance template object");
                }
            }

            return 0;
        }

        private int InstanceOwnerLookup(InstanceOwnerLookup lookup, ref ActionResult errorResult)
        {
            if (lookup != null)
            {
                try
                {
                    string personOrOrganisationNumber = CollectIdFromLookup(lookup);

                    int? instanceOwnerLookup = LookupIdFromBridgeRegistry(personOrOrganisationNumber).Result;

                    if (instanceOwnerLookup.HasValue)
                    {
                        return instanceOwnerLookup.Value;
                    }
                    else
                    {
                        errorResult = BadRequest("Instance owner lookup failed.");
                    }
                }
                catch (Exception e)
                {
                    errorResult = BadRequest(e.Message);
                }
            }
            else
            {
                errorResult = BadRequest("InstanceOwnerLookup cannot have null value if instanceOwnerId is not set. Cannot resolve instance owner id");
            }

            return 0;
        }

        private async Task<int?> LookupIdFromBridgeRegistry(string id)
        {
            try
            {
                Uri bridgeRegistryLookupUri = new Uri("parties/lookup", UriKind.Relative);

                string idAsJson = JsonConvert.SerializeObject(id);

                HttpResponseMessage response = await bridgeRegistryClient.PostAsync(
                    bridgeRegistryLookupUri,
                    new StringContent(idAsJson, Encoding.UTF8, "application/json"));

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string partyIdString = await response.Content.ReadAsStringAsync();

                    return JsonConvert.DeserializeObject<int>(partyIdString);
                }
            }
            catch (Exception e)
            {
                logger.LogError($"Lookup of instance owner id failed! {e.Message}");
            }

            return null;
        }

        private static string CollectIdFromLookup(InstanceOwnerLookup lookup)
        {
            string id = null;

            if (!string.IsNullOrEmpty(lookup.PersonNumber) && !string.IsNullOrEmpty(lookup.OrganisationNumber))
            {
                throw new ArgumentException("InstanceOwnerLookup cannot have both PersonNumber and OrganisationNumber set.");
            }

            if (!string.IsNullOrEmpty(lookup.PersonNumber))
            {
                id = lookup.PersonNumber;
            }
            else if (!string.IsNullOrEmpty(lookup.OrganisationNumber))
            {
                id = lookup.OrganisationNumber;
            }
            else
            {
                throw new ArgumentException("InstanceOwnerLookup must have either PersonNumber or OrganisationNumber set.");
            }

            return id;
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instance">instance</param>
        /// <returns>The updated instance</returns>
        [HttpPut("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Put(int instanceOwnerId, Guid instanceGuid, [FromBody] Instance instance)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance existingInstance;
            try
            {
                existingInstance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);
            }
            catch (Exception e)
            {
                string message = $"Unable to find instance {instanceId} to update: {e}";
                logger.LogError(message);

                return NotFound(message);
            }

            existingInstance.AppOwnerState = instance.AppOwnerState;
            existingInstance.Process = instance.Process;
            existingInstance.InstanceState = instance.InstanceState;

            existingInstance.PresentationField = instance.PresentationField;
            existingInstance.DueDateTime = DateTimeHelper.ConvertToUniversalTime(instance.DueDateTime);
            existingInstance.VisibleDateTime = DateTimeHelper.ConvertToUniversalTime(instance.VisibleDateTime);
            existingInstance.Labels = instance.Labels;

            existingInstance.LastChangedBy = User.Identity.Name;
            existingInstance.LastChangedDateTime = DateTime.UtcNow;

            Instance result;
            try
            {
                result = await _instanceRepository.Update(existingInstance);
                await DispatchEvent(instance.InstanceState.IsArchived ? InstanceEventType.Submited.ToString() : InstanceEventType.Saved.ToString(), result);
                AddSelfLinks(Request, result);
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unable to update instance object {instanceId}: {e.Message}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete an instance
        /// </summary>
        /// <param name="instanceGuid">instance id</param>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated instance object</returns>
        /// DELETE /instances/{instanceId}?instanceOwnerId={instanceOwnerId}
        [HttpDelete("{instanceOwnerId:int}/{instanceGuid:guid}")]
        public async Task<ActionResult> Delete(Guid instanceGuid, int instanceOwnerId, bool? hard)
        {
            string instanceId = $"{instanceOwnerId}/{instanceGuid}";

            Instance instance;
            try
            {
                instance = await _instanceRepository.GetOne(instanceId, instanceOwnerId);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Didn't find the object that should be deleted with instanceId={instanceId}");
                }

                return StatusCode(500, $"Unknown database exception in delete: {dce}");
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Unknown exception in delete: {e}");
            }

            if (hard.HasValue && hard == true)
            {
                try
                {
                    await _instanceRepository.Delete(instance);

                    return Ok(true);
                }
                catch (Exception e)
                {
                    return StatusCode(500, $"Unknown exception in delete: {e}");
                }
            }
            else
            {
                instance.InstanceState.IsDeleted = true;
                instance.LastChangedBy = User.Identity.Name;
                instance.LastChangedDateTime = instance.InstanceState.DeletedDateTime = DateTime.UtcNow;

                try
                {
                    Instance softDeletedInstance = await _instanceRepository.Update(instance);

                    return Ok(softDeletedInstance);
                }
                catch (Exception e)
                {
                    return StatusCode(500, $"Unknown exception in delete: {e}");
                }
            }
        }

        private async Task DispatchEvent(string eventType, Instance instance)
        {
            InstanceEvent instanceEvent = new InstanceEvent
            {
                AuthenticationLevel = 0, // update when authentication is turned on
                EventType = eventType,
                InstanceId = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                UserId = 0, // update when authentication is turned on
                ProcessInfo = instance.Process,
            };

            await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
        }
    }

    /// <summary>
    /// A helper to organise the parts in a multipart
    /// </summary>
    internal class Part
    {
        /// <summary>
        /// The stream to access this part.
        /// </summary>
        public Stream Stream { get; set; }

        /// <summary>
        /// The file name as given in content description.
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// The parts name.
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The content type of the part.
        /// </summary>
        public string ContentType { get; set; }

        /// <summary>
        /// The file size of the part, if given.
        /// </summary>
        public long FileSize { get; set; }
    }
}
