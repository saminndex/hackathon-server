const duration = 45;

class Helpers {
  static createPrompt(chapterTitle, previousChapters, previousOption, language, genre) {
    return `
       Let's create a "Choose Your Adventure" type story of genre "${genre}" (it needs to be appropriate for all ages). You are to generate ${chapterTitle} of the story only.
    
       Please provide the chapter narrative, followed by two choices for the reader to select from. These choices will determine the direction of the subsequent chapter.

       ${
         previousChapters?.length
           ? `For context, here are the previous chapters and the chosen option from the previous chapter, for the next chapter:
            - Previous Chapters: ${JSON.stringify(previousChapters)}
            - Last Chosen Option: ${previousOption}`
           : ""
       }
        
        The response format must be JSON, structured as follows:
        {
            "content": "string",
            "optionA": "string",
            "optionB": "string",
            "image": "string",
            "title": "string",
        }

        Rules:
         - If it's the first chapter, include the title of the story
         - Include an image prompt, which I will use to generate a visual representation of the story
         - Each chapter should take approximately ${duration} seconds to read
         - Your response must be a valid structured json object only
         - JSON.parse() will be used on your response, so format it accordingly, do not include any special characters or extraneous text outside of the curly braces which could break the parsing
         - Do not explicitly mention the options inside the content itself, keep those separate in the optionA and optionB fields
         - Do not include the chapter number in the story title
         - The language of your content, options and title must be: ${language}, except for the 'image' field must always be in plain english
      `;
  }
  static safeParseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (error) {
      const firstCurlyIndex = str.indexOf("{");
      const lastCurlyIndex = str.lastIndexOf("}");
      if (firstCurlyIndex === -1 || lastCurlyIndex === -1 || firstCurlyIndex >= lastCurlyIndex) {
        throw new Error("No JSON content found.");
      }

      const jsonString = str.substring(firstCurlyIndex, lastCurlyIndex + 1);

      let cleanedString = jsonString
        .replace(/```json|```/g, "")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2":')
        .replace(/\\'/g, "'")
        .replace(/\r?\n|\r/g, "")
        .replace(/\t/g, "")
        .trim();

      try {
        return JSON.parse(cleanedString);
      } catch (finalError) {
        return { error: "Failed to parse JSON", details: finalError.message, cleanedString };
      }
    }
  }
  static l18n(key, language) {
    const strings = {
      chapter: {
        English: "Chapter",
        "Mandarin Chinese (Simplified)": "章",
        Hindi: "अध्याय",
        Spanish: "Capítulo",
        French: "Chapitre",
        Arabic: "الفصل",
        Russian: "Глава",
        Portuguese: "Capítulo",
        Italian: "Capitolo",
        German: "Kapitel",
      },
      optionA: {
        English: "Will you choose option A",
        "Mandarin Chinese (Simplified)": "你会选择选项A吗",
        Hindi: "क्या आप विकल्प ए चुनेंगे",
        Spanish: "¿Elegirás la opción A",
        French: "Choisirez-vous l'option A",
        Arabic: "هل ستختار الخيار أ",
        Russian: "Вы выберете вариант А",
        Portuguese: "Você escolherá a opção A",
        Italian: "Sceglierai l'opzione A",
        German: "Wirst du Option A wählen",
      },
      optionB: {
        English: "or option B?",
        "Mandarin Chinese (Simplified)": "还是选项B",
        Hindi: "या विकल्प बी",
        Spanish: "¿O la opción B",
        French: "ou l'option B",
        Arabic: "أو الخيار ب؟",
        Russian: "или вариант Б",
        Portuguese: "ou opção B",
        Italian: "o l'opzione B",
        German: "oder Option B",
      },
    };

    return strings[key][language];
  }
}

module.exports = {
  Helpers,
};
