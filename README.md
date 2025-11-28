# AI Chat Template

A personal-use template for AI character chat applications. Designed to either work standalone or serve as a base for forking into other projects.

Derived from an AI dating app I made, check it out: https://github.com/ForgottenHistory/Cupid-AI

![AI Chat](images/chat.png)

## Features

- **Character Cards** - Import V1/V2 character card formats with automatic image extraction from PNG metadata
- **Multi-LLM Architecture** - Separate LLM configurations for different purposes:
  - **Chat LLM** - Main conversation engine
  - **Decision LLM** - Determines actions (e.g., when to send images)
  - **Content LLM** - Rewrites/generates character metadata
  - **Image LLM** - Generates Danbooru-style tags for image generation
- **Stable Diffusion Integration** - Generate character images via local SD WebUI API
- **Per-Character Image Settings** - Customize image generation per character:
  - Always-included tags (appearance)
  - Contextual tags (AI chooses based on conversation)
  - Prompt overrides
- **Conversation Management** - Multiple conversations per character with message history
- **Swipes** - Generate alternative responses and swipe between them
- **Impersonate** - Generate responses as the user character
- **File-Based Prompts** - Edit system prompts through the UI or directly in `data/prompts/`

![AI Chat](images/character_profile.png)

## Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite with Drizzle ORM
- **LLM Providers**: OpenRouter, Featherless
- **Image Generation**: Stable Diffusion WebUI API

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and add your API keys:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   FEATHERLESS_API_KEY=...        # optional
   SD_SERVER_URL=http://127.0.0.1:7860  # optional, for image generation
   ```
4. Initialize the database:
   ```bash
   npm run db:push
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run check      # Type check
npm run db:push    # Push schema to database
npm run db:studio  # Open Drizzle Studio
```

## Forking

This template is designed to be forked. Key extension points:

- **Add new LLM engines** - Follow the pattern in `src/lib/server/services/`
- **Custom prompts** - Add files to `data/prompts/` and register in the Prompts page
- **New character fields** - Extend the schema in `src/lib/server/db/schema.ts`
- **Additional settings** - Add tables following the existing `*Settings` pattern

## License

MIT
