using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.App.PlatformServices.Models
{
    public class ProcessResult
    {

        public Instance Instance { get; set; }

        public List<InstanceEvent> Events { get; set; }
        
    }
}
