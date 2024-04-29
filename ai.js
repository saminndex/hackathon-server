const { Success, Failure } = require("./utils/responseService");
const { OpenAI } = require("openai");
const { VertexAI } = require("@google-cloud/vertexai");
const { Helpers } = require("./utils/helpers");

const textModel = "gemini-1.0-pro";
const maxRetries = 5;

module.exports = {
  generate: async (req, res) => {
    const authOptions = {
      keyFile: process.env.NODE_ENV === "dev" ? "./secrets.json" : "/etc/secrets/hackathon-secrets.json",
    };

    const vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION,
      googleAuthOptions: authOptions,
    });

    let { previousChapters, previousOption } = req.body;

    let totalPreviousChapters = previousChapters?.length || 0;
    let thisChapterNumber = totalPreviousChapters + 1;
    let thisChapter = totalPreviousChapters > 0 ? `Chapter ${thisChapterNumber}` : "Chapter 1";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log("Attempt: " + attempt);

      try {
        let prompt = Helpers.createPrompt(thisChapter, previousChapters, previousOption);

        let request = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        };

        console.log("Generating text...");

        let result = await vertexAI.getGenerativeModel({ model: textModel }).generateContent(request);
        let part = result.response.candidates[0].content?.parts[0]?.text;
        let parsedPart = Helpers.safeParseJSON(part);

        if (parsedPart && parsedPart.content && (thisChapterNumber === 1 ? parsedPart.image : true)) {
          return handleSuccess(parsedPart, thisChapterNumber, res);
        }
      } catch (err) {
        console.error(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt === maxRetries) {
          return Failure(res, err.statusCode || 500, "Unable to generate a valid chapter after several attempts.");
        }
      }
    }
  },
};

async function handleSuccess(parsedPart, chapterNumber, res) {
  console.log("Generating audio...");

  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
  });

  let mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: `${chapterNumber === 1 ? parsedPart.title : ""}. Chapter ${chapterNumber}. ${
      parsedPart.content
    }. Will you choose option A: ${parsedPart.optionA}, or option B: ${parsedPart.optionB}?`,
  });

  parsedPart.audio = Buffer.from(await mp3.arrayBuffer());

  if (chapterNumber === 1) {
    console.log("Generating image...");

    let imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: parsedPart.image,
      n: 1,
      size: "256x256",
    });

    parsedPart.image = imageResponse.data[0].url;
  }

  console.log("Chapter complete");

  return Success(res, parsedPart);
}
