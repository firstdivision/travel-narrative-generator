import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const notesPath = "public/travel/notes.md";
const stylePath = "public/travel/style.md";
const outputPath = "public/travel/narrative.md";

const notes = fs.readFileSync(notesPath, "utf8");
const style = fs.existsSync(stylePath)
  ? fs.readFileSync(stylePath, "utf8")
  : "";

const prompt = `
You are rewriting raw travel notes into a polished first-person travel narrative.

Requirements:
- Preserve factual details from the notes.
- Keep the narrator's observations, mood, and chronology.
- Write vividly, but do not invent events.
- Keep proper nouns and logistics accurate.
- Preserve markdown headings from source notes.
- Keep heading levels intact (for example, # remains # and ## remains ##).
- Keep headings in the same order they appear in the source.
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

fs.writeFileSync(outputPath, text);
console.log(`Updated ${outputPath}`);