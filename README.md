This repo contains the server side code for The Infinite Story project, submitted to Google's AI Hackathon 2024.

The front-end repo can be found here: https://github.com/saminndex/hackathon-client

#Local Development Instructions

1. Create a `secrets.json` file in the root of this directory, containing your GCP Service Account JSON
2. Create an `.env` file also in the directory, containing the following variables: GCP_PROJECT_ID, GCP_LOCATION, OPEN_AI_KEY
3. Run `npm run start:dev` to start the express service
