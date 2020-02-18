import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as pdf from "../../Apicalls/Platform/pdf.js"

let ErrorCount = new Counter("errors");
let pdfInputJson = open("../../Data/pdfInput.json");

export const options = {    
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Test for platform generate pdf and validate response
export default function() {    
    var res = pdf.generatePdf(pdfInputJson);   
    var success = check(res, {
      "Generate PDF: Status is 200": (r) => r.status === 200,
      "Generate PDF: Content-Type is application/pdf": (r) => r.headers["Content-Type"] === "application/pdf"
  });  
  if (!success){
      ErrorCount.add(1);
  };
  sleep(1);
};