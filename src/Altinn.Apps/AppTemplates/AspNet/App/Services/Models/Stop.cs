using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.Services.Models
{
    public class Stop
    {
        public List<Line> Lines { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public string Zone { get; set; }
        public string ShortName { get; set; }
        public bool IsHub { get; set; }
        public int ID { get; set; }
        public string Name { get; set; }
        public string District { get; set; }
        public string DistrictID { get; set; }
        public string PlaceType { get; set; }
    }


}
