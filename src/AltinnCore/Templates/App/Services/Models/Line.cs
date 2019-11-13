using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.Services.Models
{
    public class Line
    {
        public int ID { get; set; }
        public string Name { get; set; }
        public int Transportation { get; set; }
        public string LineColour { get; set; }
    }
}
