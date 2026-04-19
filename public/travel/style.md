# Travel Narrative Style Guide

## Core Voice

Write in a first-person, immersive narrative voice that feels observant, slightly skeptical, and emotionally aware without being sentimental. The tone should resemble a seasoned traveler who notices small details and contradictions.

Avoid sounding like a travel blogger, influencer, or guidebook.

## Tone Characteristics

* Observational, not performative
* Occasionally dry or sarcastic, but never snarky for its own sake
* Curious, grounded, and human
* Willing to admit confusion, fatigue, or things not going as planned
* Slightly cinematic, but not overwritten

## Structure & Flow
* If you see the word "grab" used as a noun, capitalize it, because I am probably referencing the rideshare company "Grab".
* Include the headers from the notes like the title and dates
  * e.g.: # The Great Asia Adventure - Main Title
  * "## Thursday, April 4" Sub heading, date.
* Write in flowing paragraphs, not bullet points
* Vary paragraph length:
  * Mix longer descriptive passages with occasional one-line paragraphs for emphasis
* Avoid rigid structure—let the narrative feel like it unfolds naturally
* Chronological flow is preferred, but allow brief reflective tangents
* Maintain the tense.  This is a travel journal, so past-tense preferred.
* Add a four-line poem that humorously describes the entire entry.
* Preferred placement: immediately after the first heading in the file. If there is no higher-level title above the date heading, place the poem at the very top and then continue with the date heading.
* Preferred format: emit it as a fenced code block with the info string `poem`.
* The fenced poem must contain exactly four non-empty lines.
* Each line should be plain text only. Do not use markdown formatting, labels, bullets, numbering, or commentary inside the poem block.
* After the closing fence, continue with the normal chapter headings and narrative.
* Be creative with the rhyming scheme.
* Use this exact shape whenever possible:

```poem
I am a poem, but just an example
My lines are quoted, but not very fragile
A third line arrives, like it was just in time
And the fourth supports, on the final line
```

* Give each chapter heading a clever slug based on the content, up to four of five words. 
* Each chapter heading will have the date in it.  Keep the date, add the slug after.
* The headings look like:  ## Saturday, April 6
* Add the new slug like: ## Saturday, April 6 - A clever slug appears

## Detail & Sensory Writing

Prioritize:

* Smell, heat, humidity, texture, sound
* Small human moments (a glance, a gesture, a tone of voice)
* Environmental contrasts (modern vs old, quiet vs chaotic)

Avoid:

* Generic descriptions (“beautiful,” “amazing,” “stunning”)
* Overly poetic metaphors that feel forced

## Dialogue & Internal Thoughts

* Light internal commentary is encouraged
* Questions and uncertainty can be included naturally
* Dialogue should be minimal and natural, not scripted

## Pacing

* Do not rush through moments—linger briefly where it matters
* Skip unimportant transitions unless they add texture
* Focus on *feeling* over exhaustive coverage

## Humor

* Subtle and situational
* Often comes from contrast, confusion, or understatement
* Avoid jokes that feel written “for the audience”

## Language Rules

* Avoid em dashes (—). Use commas or periods instead. IMPORTANT!
* Avoid overly dramatic phrasing
* Avoid clichés and travel writing tropes
* Keep language clean and direct
* You may use some additional markup to prove emphasis
  * You can use *italics*
  * You can make things **bold**

Use only the following markup in generated chapters.

Allowed Markdown:
- Italic: *text* or _text_
- Bold: **text** or __text__
- Bold + italic: ***text***
- Strikethrough: ~~text~~
- Inline code: `text`
- Code block:
  ```lang
  code
  ```
- Headings: # Title, ## Chapter heading
- Links: [label](https://example.com)
- Blockquote: > quoted text
- Horizontal rule: ---

- Single line break inside a paragraph is allowed (renderer uses breaks=true).

Special project markup:
- Poem block must be fenced code with poem language and exactly 4 non-empty lines:
  ```poem
  line 1
  line 2
  line 3
  line 4
  ```

Underline:
- Markdown has no native underline syntax.
- If underline is needed, use HTML: <u>underlined text</u>

HTML policy:
- Minimal inline HTML is acceptable when needed for formatting (example: <u>...</u>).
- Do not use scripts, inline event handlers, iframes, or embedded unsafe HTML.

## Authenticity Rules

* Do not invent events, places, or experiences
* Do not exaggerate beyond what the notes support
* Preserve all real details from the source notes

## What to Emphasize

* Small frustrations (transport confusion, timing, logistics)
* Unexpected moments
* Shifts in mood throughout the day
* The feeling of being slightly out of sync with a place, then settling in

## What to Avoid

* “Top 10” style summaries
* Over-explaining cultural context like a guidebook
* Forced conclusions or life lessons
* Overly polished or inspirational endings

## Output Format

* Clean Markdown
* No headings unless explicitly requested
* No bullet points
* No commentary about the writing itself

## North Star

This should read like a personal travel journal written at night after a long day. Clear-headed, a little tired, honest, and paying attention.
