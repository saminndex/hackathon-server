const { Success, Failure } = require("./utils/responseService");
const { OpenAI } = require("openai");
const { VertexAI, HarmCategory, HarmBlockThreshold } = require("@google-cloud/vertexai");
const { Helpers } = require("./utils/helpers");

const textModel = "gemini-1.0-pro-002";
const maxRetries = 5;
const fallbackLanguage = "English";

module.exports = {
  generate: async (req, res) => {
    const labelWithTime = generateLabelWithTime();
    console.time(labelWithTime);

    const authOptions = generateAuthOptions();

    const vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION,
      googleAuthOptions: authOptions,
    });

    const { previousChapters, previousOption, language } = req.body;

    const thisChapterNumber = (previousChapters?.length || 0) + 1;
    const thisChapter = `Chapter ${thisChapterNumber}`;

    const model = vertexAI.getGenerativeModel({
      model: textModel,
      safetySettings: generateSafetySettings(),
    });

    const prompt = Helpers.createPrompt(thisChapter, previousChapters, previousOption, language || fallbackLanguage);

    try {
      const parsedPart = await generateChapter(model, prompt, thisChapterNumber);
      handleSuccess(
        parsedPart,
        thisChapterNumber,
        res,
        language || fallbackLanguage,
        parsedPart.attempt,
        labelWithTime
      );
    } catch (err) {
      handleError(err, res);
    }
  },
};

async function generateChapter(model, prompt, thisChapterNumber) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
      const part = result.response.candidates[0]?.content?.parts[0]?.text;
      const parsedPart = Helpers.safeParseJSON(part);

      if (parsedPart && parsedPart.content && (thisChapterNumber === 1 ? parsedPart.image : true)) {
        parsedPart.attempt = attempt;
        parsedPart.source = "vertex";
        return parsedPart;
      }
    } catch (err) {
      if (err.message?.includes("Too Many Requests")) {
        console.error(`Attempt ${attempt} failed: ${err.message}, trying fallback`);
        const fallbackResult = await fallbackAI(prompt);
        const parsedPart = Helpers.safeParseJSON(fallbackResult);
        if (parsedPart && parsedPart.content && (thisChapterNumber === 1 ? parsedPart.image : true)) {
          parsedPart.attempt = attempt;
          parsedPart.source = "gpt";
          return parsedPart;
        }
      } else {
        throw err;
      }
      if (attempt === maxRetries) {
        throw new Error("Unable to generate a valid chapter after several attempts, please refresh your browser");
      }
    }
  }
}

//Fallback GPT used due to the frequency of Vertex quota exceeded errors
//Potential issue with their quota allocation to the gemini model I'm using (should be 300/min, not 5/min)
//Have reached out to support to no avail
async function fallbackAI(prompt) {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}

async function handleSuccess(parsedPart, chapterNumber, res, language, attempt, labelWithTime) {
  const openai = getOpenAI();

  const speechInput = generateSpeechInput(parsedPart, chapterNumber, language);
  const mp3 = await openai.audio.speech.create(speechInput);
  const parsedPartWithAudio = await generateParsedPartWithAudio(mp3, parsedPart, chapterNumber, openai);

  console.log(`Complete on attempt ${attempt}`);
  console.timeEnd(labelWithTime);

  return Success(res, parsedPartWithAudio);
}

function handleError(err, res) {
  return Failure(res, err.statusCode || 500, err.message);
}

function generateLabelWithTime() {
  return "generate " + Date.now();
}

function generateAuthOptions() {
  return {
    keyFile: process.env.NODE_ENV === "dev" ? "./secrets.json" : "/etc/secrets/hackathon-secrets.json",
  };
}

function generateSafetySettings() {
  return [
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
}

function generateSpeechInput(parsedPart, chapterNumber, language) {
  return {
    model: "tts-1",
    voice: "onyx",
    input: `${chapterNumber === 1 ? parsedPart.title : ""}. ${Helpers.l18n("chapter", language)} ${chapterNumber}. ${
      parsedPart.content
    }. ${Helpers.l18n("optionA", language)}, ${parsedPart.optionA}?. ${Helpers.l18n("optionB", language)}, ${
      parsedPart.optionB
    }?`,
  };
}

async function generateParsedPartWithAudio(mp3, parsedPart, chapterNumber, openai) {
  const audioData = await mp3.arrayBuffer();
  const audioBuffer = Buffer.from(audioData);

  if (chapterNumber === 1) {
    console.log("Image: " + parsedPart.image);
    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: parsedPart.image,
      n: 1,
      size: "256x256",
    });
    parsedPart.image = imageResponse.data[0]?.url;
  }

  parsedPart.audio = audioBuffer;
  return parsedPart;
}

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
  });
}
