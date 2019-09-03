using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Data controller
    /// </summary>
    [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/data")]
    public class DataController : ControllerBase
    {
        private readonly ILogger<DataController> logger;
        private readonly IData dataService;
        private readonly IInstance instanceService;

        /// <summary>
        /// The data controller. Currently only GET is supported.
        /// </summary>
        /// <param name="logger">logger</param>
        /// <param name="dataService">dataservice</param>
        public DataController(
            ILogger<DataController> logger,
            IData dataService,
            IInstance instanceService)
        {
            this.logger = logger;
            this.dataService = dataService;
            this.instanceService = instanceService;
        }

        /// <summary>
        /// Gets a data element.
        /// </summary>
        /// <param name="org">org</param>
        /// <param name="app">app</param>
        /// <param name="instanceOwnerId">owner</param>
        /// <param name="instanceGuid">instance guid</param>
        /// <param name="dataGuid">data guid</param>
        /// <returns>The data element</returns>
        [HttpGet("{dataGuid:guid}")]
        public async Task<ActionResult> Get(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceGuid);

            DataElement dataElement = instance.Data.Find(d => d.Id == dataGuid.ToString());

            Stream dataStream = await dataService.GetData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            if (dataStream != null)
            {
                return File(dataStream, dataElement.ContentType, dataElement.FileName);
            }
            else
            {
                return NotFound();
            }
        }
    }
}
