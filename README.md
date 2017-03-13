# OpenALPR-server
NodeJS server for OpenALPR.

# Running
docker run -p 8080:8080 samuelbr/openalpr-server

# Making a request
curl -X GET http://localhost:8080/?image_url=http://www.example.com/yourimage.jpg&type=eu
curl -X POST --data-binary "@yourimage.jpg" http://localhost:8080/?country_code=gb
