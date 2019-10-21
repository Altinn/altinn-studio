#Naive runner for newman postman cli tool. Add your collection to the collections folder, update env file
cd ./src/test/postman
npm install -g newman
for collection in ./collections/*; do 
    newman run "$collection" --environment ./altinn.postman_environment.json -r junit; 
done
