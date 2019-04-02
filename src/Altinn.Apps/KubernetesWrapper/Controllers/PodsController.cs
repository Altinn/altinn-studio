using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PodsController : ControllerBase
    {

        private readonly IKubernetesAPIWrapper _apiWrapper;

        public PodsController(IKubernetesAPIWrapper apiWrapper)
        {
            _apiWrapper = apiWrapper;
        }

        // GET api/pods
        [HttpGet]
        public Task<IList<k8s.Models.V1Pod>> Get()
        {
            return _apiWrapper.GetAllPods();
        }

        [HttpGet]
        public ActionResult<IEnumerable<string>> GetDummyData()
        {
            return _apiWrapper.GetDummyData().ToArray();
        }
    }
}
