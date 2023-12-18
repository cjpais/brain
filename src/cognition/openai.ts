import OpenAI from "openai";
import fs from "fs";

// TODO should this be in 'understanding' or something? TBD
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateCompletion = async (
  systemPrompt: string,
  message: string
) => {
  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  return result.choices[0].message.content;
};

export const generateEmbeddings = async (texts: string[]) => {
  const response = await openai.embeddings.create({
    input: texts,
    model: "text-embedding-ada-002",
  });
  return response.data.map((d) => d.embedding);
};

export const generateTranscriptions = async (files: string[]) => {
  const transcriptions = await Promise.all(
    files.map((filename, idx) => {
      return openai.audio.transcriptions
        .create({
          file: fs.createReadStream(filename),
          model: "whisper-1",
          prompt:
            "Transcribe the audio. Note you will come across some new names. They are: Dr. Lingonberry. Spurvis. Pasquale.",
        })
        .then((transcription) => ({
          transcription: transcription.text,
          number: idx,
        }));
    })
  );

  return transcriptions
    .sort((a, b) => a.number - b.number)
    .map((t) => t.transcription);
};
