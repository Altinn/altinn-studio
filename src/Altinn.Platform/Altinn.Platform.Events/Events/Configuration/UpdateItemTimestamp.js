function updateItemTimestamp() {
  var context = getContext();
  var request = context.getRequest();

  // item to be created in the current operation
  var itemToCreate = request.getBody();

  // update timestamp
  itemToCreate["time"] = new Date().toISOString();

  // update the item that will be created
  request.setBody(itemToCreate);
}
