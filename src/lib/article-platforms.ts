export const articlePlatforms = [
  { value: "openai", label: "OpenAI", sourceNames: ["OpenAI"] },
  { value: "anthropic", label: "Anthropic", sourceNames: ["Anthropic"] },
  {
    value: "google-deepmind",
    label: "Google DeepMind",
    sourceNames: ["Google DeepMind"],
  },
  { value: "meta-ai", label: "Meta AI", sourceNames: ["Meta AI"] },
  { value: "mistral", label: "Mistral", sourceNames: ["Mistral"] },
  {
    value: "hacker-news",
    label: "Hacker News",
    sourceNames: ["Hacker News"],
  },
  {
    value: "machine-learning",
    label: "r/MachineLearning",
    sourceNames: ["r/MachineLearning"],
  },
  {
    value: "local-llama",
    label: "r/LocalLLaMA",
    sourceNames: ["r/LocalLLaMA"],
  },
  {
    value: "hugging-face",
    label: "Hugging Face",
    sourceNames: ["Hugging Face Daily Papers"],
  },
  {
    value: "arxiv",
    label: "arXiv",
    sourceNames: ["arXiv cs.AI", "arXiv cs.SE"],
  },
] as const;

export type ArticlePlatform = (typeof articlePlatforms)[number];

export function findArticlePlatform(value: string | undefined) {
  return articlePlatforms.find((platform) => platform.value === value) ?? null;
}
