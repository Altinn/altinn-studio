package altinn.platform.pdf.models;

import java.util.HashMap;

public class OptionsDictionary{

private  HashMap<String, HashMap<String, String>> optionsDictionary = new HashMap<String, HashMap<String, String>>();

public  HashMap<String, HashMap<String, String>> getOptionsDictionary(){return optionsDictionary;}

public void setOptionsDictionary(HashMap<String, HashMap<String, String>> options){
    this.optionsDictionary = options;
} 

public  HashMap<String, String> getOptions(String optionsId){
  return optionsDictionary.get(optionsId);
}
}