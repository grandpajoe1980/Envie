import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PronunciationResult {
  score: number;
  feedback: string;
  wordBreakdown: {
    word: string;
    score: number;
    feedback: string;
  }[];
}

export async function evaluatePronunciation(
  audioBase64: string,
  targetText: string,
  language: 'vn' | 'en'
): Promise<PronunciationResult> {
  // Use flash-lite to help mitigate quota exhaustion limitations if user is on free tier
  const model = "gemini-3.1-flash-lite-preview";
  
  const prompt = `
    You are a language teacher evaluating a student's pronunciation.
    Target sentence: "${targetText}"
    Language: ${language === 'vn' ? 'Vietnamese' : 'English'}
    
    Listen to the student's audio and provide a detailed evaluation.
    Focus on:
    - Tone accuracy (if Vietnamese)
    - Phonetic accuracy
    - Rhythm and flow
    
    CRITICAL: Provide specific instructions per word if there is a mistake. 
    Explain what went wrong to lose the score and guide towards better pronunciation.
    For example: "The 'gi' in 'giữ' is pronounced like a 'z' (zee), not a hard 'g'" or "The 'r' in 'rất' is pronounced like 'z' (zuht) in Northern accents".
    Be friendly but exact. Give phonetic hints.
    
    Return the evaluation in JSON format with:
    - score (0-100)
    - feedback (general encouragement and summary of the specific tips)
    - wordBreakdown (array of evaluation for each word. Exclude perfectly pronounced words if you want, but explicitly highlight mistaken words with corrections)
  `;

  const audioPart = {
    inlineData: {
      mimeType: "audio/webm", // Common for browser recordings
      data: audioBase64,
    },
  };

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [audioPart, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          wordBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                score: { type: Type.NUMBER },
                feedback: { type: Type.STRING },
              },
              required: ["word", "score", "feedback"],
            },
          },
        },
        required: ["score", "feedback", "wordBreakdown"],
      },
    },
  });

  if (!response.text) {
    throw new Error("No evaluation received from AI");
  }

  return JSON.parse(response.text.trim());
}

export async function lookupDictionary(query: string) {
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = `
    Act as a Vietnamese-English dictionary.
    Provide the translation, pronunciation guide, and example usage for: "${query}"
    
    Return JSON format:
    {
      "word": string,
      "translation": string,
      "pronunciation": string,
      "examples": [{ "vn": string, "en": string }]
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text.trim());
}

export async function generateNewSentence(difficulty: number, direction: string) {
    const model = "gemini-3.1-flash-lite-preview";
    const prompt = `
      Generate a new Vietnamese/English sentence for training.
      Difficulty: ${difficulty}/5
      Focus on everyday situations or common grammar markers.

      Pronunciation Instructions:
      - 'pronunciation' (Vietnamese): Use English-friendly phonetic spelling, but explicitly include standard Vietnamese tone marks (á, à, ả, ã, ạ) on the appropriate vowels (e.g., 'Cảm ơn' -> 'Kảm uhn', 'khỏe không' -> 'kwẻa kohm').
      - 'en_pronunciation' (English): Use intuitive, non-scholarly English respelling. Use 'arr' or 'ar' for "are", 'yoo' for "you". Capitalize STRESSED syllables (e.g., 'heh-LOH, how arr YOO?'). Do NOT use IPA.

      Return JSON:
      {
        "vn": "Vietnamese sentence",
        "en": "English Translation",
        "pronunciation": "Vietnamese Pronunciation guide",
        "en_pronunciation": "English phonetic pronunciation guide",
        "literal_translation": [
          { "word": "vietnamese word", "translation": "literal english translation" }
        ],
        "category": "vocabulary"
      }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text.trim());
}

export async function generateCustomSentence(input: string) {
    const model = "gemini-3.1-flash-lite-preview";
    const prompt = `
      The user wants to create a custom flashcard. They typed: "${input}".
      Identify the language (English or Vietnamese) and provide the translation in the other language.

      Pronunciation Instructions:
      - 'pronunciation' (Vietnamese): Use English-friendly phonetic spelling, but explicitly include standard Vietnamese tone marks (á, à, ả, ã, ạ) on the appropriate vowels (e.g., 'Cảm ơn' -> 'Kảm uhn', 'khỏe không' -> 'kwẻa kohm').
      - 'en_pronunciation' (English): Use intuitive, non-scholarly English respelling. Use 'arr' or 'ar' for "are", 'yoo' for "you". Capitalize STRESSED syllables (e.g., 'heh-LOH, how arr YOO?'). Do NOT use IPA.

      Return JSON:
      {
        "vn": "Vietnamese text",
        "en": "English text",
        "pronunciation": "Vietnamese Pronunciation guide",
        "en_pronunciation": "English phonetic pronunciation guide",
        "literal_translation": [
          { "word": "vietnamese word", "translation": "literal english translation" }
        ],
        "category": "custom"
      }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text.trim());
}
