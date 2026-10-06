# Are We Cooked Yet?

A daily, editor-reviewed reading list about AI and software engineering. Articles retain their original headlines and link to their original sources; the MVP does not generate summaries.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

The project uses Next.js App Router, TypeScript, and Tailwind CSS. Netlify deployment is configured in `netlify.toml`; public content and admin features are being implemented in staged milestones documented in `WORKFLOW.md`.
