export function About() {
  return (
    <section className="about-shell" aria-label="About this journal">
      <header className="about-header">
        <p className="chapter-kicker">About</p>
        <h2 className="chapter-title">How It Works</h2>
      </header>

      <div className="about-content">
        <p className="about-lede">
          This site turns a traveler's rough, on-the-go notes — quick bullet points and half-finished
          thoughts jotted down at the end of a long day — into the readable journal entries you see here,
          with a little help from AI.
        </p>

        <p>
          While traveling, the notes get written fast and messy: fragments, typos, things half-remembered
          through jet lag. Those raw notes are then handed to an AI assistant along with a short guidance
          document describing the voice and tone the writing should have — observant, a little tired,
          curious about people, honest about the messy parts of travel. The AI uses that guidance to turn
          the scattered notes into a proper narrative, while keeping the actual events, people, and details
          exactly as they happened.
        </p>

        <p>
          Nothing is hidden in the process. Every chapter has a small toggle near its title that lets you
          switch between the polished "AI-Assisted" version and the original "Journal" notes it was built
          from, so you can see exactly how the raw scribbles became the finished story.
        </p>

        <h3 className="about-section-title">A Deeper Dive</h3>

        <p>
          Each day of the trip starts as a handful of rough notes, usually written on a phone at the end
          of the day, half-asleep, in whatever order things happened to come to mind. Some days that's a
          few tidy sentences. Other days it's a scattered list of fragments: a place name, a smell, an
          overheard conversation, a complaint about jet lag. None of it is written to be read by anyone
          else — it's just a way of not forgetting.
        </p>

        <p>
          Those notes are paired with a written guide that describes the voice this journal should have:
          curious, a little tired, honest about the parts of travel that are frustrating or confusing, and
          not overly polished or "inspirational." That guide also captures small personal details worth
          getting right — things like how certain words should be spelled, or running jokes and quirks
          that should carry through consistently from one entry to the next.
        </p>

        <p>
          The AI's job is narrow on purpose: turn the rough notes into a proper story in that voice,
          without inventing new events, people, or details that didn't happen. It's closer to a very
          attentive editor than a ghostwriter — reorganizing, smoothing out the grammar, and filling in
          the connective tissue between bullet points, while leaving the substance of the day untouched.
        </p>

        <p>
          The result gets a light human read-through afterward, mostly to catch anything that drifted too
          far from what actually happened. And because the original notes are kept right alongside the
          finished version, nothing about the process depends on just taking its word for it — anyone
          curious can flip the toggle on any chapter and compare the "before" and "after" for themselves.
        </p>

        <h3 className="about-section-title">The Mariana Trench</h3>

        <p>
          For the curious souls who want to go a bit deeper: this whole thing is a small static website,
          built with React, that treats plain text files as its database. Every day of the trip is just
          two markdown files sitting in a folder — one for the raw notes, one for the AI-polished version
          — and the site reads those files directly rather than pulling from any kind of backend or
          content management system.
        </p>

        <p>
          The AI step isn't triggered by hand. A GitHub Action, a little automated helper that watches
          this project's code repository, notices when a new raw-notes file shows up and kicks off the
          rewrite automatically. It hands the notes to an AI model (something in the Claude or GPT family)
          along with the style guide as its instructions, and saves whatever comes back as the new,
          polished chapter file. No servers to babysit, no button to click — just a file appearing in one
          folder and, a little while later, its counterpart appearing in another.
        </p>

        <p>
          The browser side is deliberately simple too. There's a small index file, generated automatically,
          that lists every chapter and where to find it — think of it as a table of contents the app reads
          on load. From there it's just fetching markdown, turning it into HTML, and rendering it. The
          "AI-Assisted / Journal" toggle you've been playing with just swaps which of those two files gets
          rendered for the chapter you're on. Photos work the same way: a generated list of filenames per
          day, fetched only when you actually need them.
        </p>

        <p>
          Put it all together and there's no database, no admin dashboard, and nothing to log into. Just
          folders of text files, one small automated helper turning notes into prose, and a browser app
          that reads whatever's there. It's a little unglamorous by design — the fanciest part of the
          whole system is arguably the AI, and everything around it is deliberately boring, static, and
          easy to reason about.
        </p>
      </div>
    </section>
  );
}
