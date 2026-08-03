import Anthropic from "@anthropic-ai/sdk";

// La API key se lee de la variable de entorno ANTHROPIC_API_KEY (nunca la escribas en el código)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-5";
