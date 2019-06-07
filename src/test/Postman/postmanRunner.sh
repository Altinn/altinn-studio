#Naive runner for newman postman cli tool. Add a new line with your new collection and environment
pwd=$(pwd)
npm install -g newman
newman run $pwd/collections/Altinn-platform-SBL-integration.postman_collection.json -e pwd/environments/Altinn-platform-SBL-bridge.postman_environment -r junit
newman run $pwd/collections/Events.postman_collection.json -e pwd/environments/Platform_Altinn_Cloud.postman_environment -r junit
newman run $pwd/collections/Events.postman_test_run.json -e pwd/environments/Platform_Altinn_Cloud.postman_environment -r junit
