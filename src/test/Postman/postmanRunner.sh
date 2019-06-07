#Naive runner for newman postman cli tool. Add a new line with your new collection and environment
PATH="`dirname \"$0\"`"
npm install -g newman
newman run $PATH/collections/Altinn-platform-SBL-integration.postman_collection.json -e $PATH/environments/Altinn-platform-SBL-bridge.postman_environment -r junit
newman run $PATH/collections/Events.postman_collection.json -e $PATH/environments/Platform_Altinn_Cloud.postman_environment -r junit
newman run $PATH/collections/Events.postman_test_run.json -e $PATH/environments/Platform_Altinn_Cloud.postman_environment -r junit
