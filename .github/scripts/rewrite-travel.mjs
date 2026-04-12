import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const notes = fs.readFileSync("travel/notes.md", "utf8");
const style = fs.existsSync("travel/style.md")
  ? fs.readFileSync("travel/style.md", "utf8")
  : "";

const prompt = `
You are rewriting raw travel notes into a polished first-person travel narrative.

Requirements:
- Preserve factual details from the notes.
- Keep the narrator's observations, mood, and chronology.
- Write vividly, but do not invent events.
- Keep proper nouns and logistics accurate.
- Output only markdown for the final narrative.

Style guide:
${style}

Source notes:
${notes}
`;

const response = await client.responses.create({
  model: "gpt-5.4",
  input: prompt
});

const text =
  response.output_text ||
  "No narrative was returned by the model.";

fs.writeFileSync("travel/narrative.md", text);
console.log("Updated travel/narrative.md");