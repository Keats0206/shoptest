import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface StyleProfile {
  gender: string;
  bodyType: string;
  styleVibe: string;
  budget: string;
  shoppingFor: string;
  favoriteBrands?: string | string[]; // Support both string (comma-separated) and array
  colorPreferences: string;
}

export async function generateSearchQueries(profile: StyleProfile): Promise<string[]> {
  // Format brands for prompt
  const brandsText = Array.isArray(profile.favoriteBrands) 
    ? profile.favoriteBrands.join(', ')
    : profile.favoriteBrands || 'None specified';
    
  const prompt = `Based on this women's style profile: Body Type: ${profile.bodyType}, Style Vibe: ${profile.styleVibe}, Budget: ${profile.budget}, Shopping For: ${profile.shoppingFor}, Favorite Brands: ${brandsText}, Color Preferences: ${profile.colorPreferences}

Generate 4-6 specific women's product search queries that would create cohesive outfits. Focus on ${profile.styleVibe} aesthetic, ${profile.colorPreferences} color palette, and ${profile.budget} price range. ${brandsText !== 'None specified' ? `Prioritize products from these brands when possible: ${brandsText}.` : ''} The queries should create a complete wardrobe - include tops, bottoms, outerwear, shoes, and accessories that work together.

Think sophisticated, modern, tailored pieces that a woman would wear. Return ONLY a valid JSON array of search strings, nothing else. Example format: ["womens ${profile.styleVibe} ${profile.colorPreferences} blouse", "tailored ${profile.colorPreferences} trousers", "${profile.colorPreferences} loafers", "${profile.styleVibe} blazer", "structured handbag", "${profile.colorPreferences} coat"]`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    const queries = JSON.parse(content.text) as string[];
    if (!Array.isArray(queries)) {
      throw new Error('Response is not an array');
    }
    return queries.slice(0, 4); // Ensure max 4 queries
  } catch (error) {
    // Fallback: try to extract array from text
    const text = content.text.trim();
    const arrayMatch = text.match(/\[([\s\S]*?)\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as string[];
      } catch {
        throw new Error('Failed to parse search queries from Claude response');
      }
    }
    throw new Error('Failed to parse search queries from Claude response');
  }
}

export async function generateProductReason(
  productName: string,
  brand: string,
  profile: StyleProfile
): Promise<string> {
  const prompt = `Given this product: "${productName}" by ${brand}, and this style profile (${profile.styleVibe} vibe, ${profile.bodyType} body type, ${profile.colorPreferences} colors), generate a concise 1-line reason (max 15 words) why this item fits their style. Be specific and personal.

Example: "This minimalist blazer perfectly complements your classic aesthetic and neutral palette."
Return ONLY the reason, no quotes or formatting.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text.trim();
}

