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

export interface OutfitItem {
  category: string;
  query: string;
  reasoning: string;
}

export interface Outfit {
  name: string;
  occasion: string;
  items: OutfitItem[];
}

export interface VersatilePiece {
  category: string;
  query: string;
  reasoning: string;
}

export interface OutfitStructure {
  outfits: Outfit[];
  versatile_pieces: VersatilePiece[];
}

export interface QuizData {
  styles: string[];
  occasions: string[];
  bodyType: string;
  fitPreference?: string;
  budgetRange: string;
  avoidances: string[];
  mustHaves: string[];
  colorPreferences?: string;
  favoriteBrands?: string[];
  gender?: 'male' | 'female' | 'unisex' | string; // For Channel3 API: 'male', 'female', 'unisex'
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

export async function generateOutfitStructure(quiz: QuizData): Promise<OutfitStructure> {
  const systemPrompt = `You are a fashion stylist AI. Generate product search queries for cohesive outfits based on the user's style profile.

Output format:
{
  "outfits": [
    {
      "name": "Casual Weekend",
      "occasion": "Relaxed brunch or coffee",
      "items": [
        {
          "category": "top",
          "query": "oversized cream cable knit sweater",
          "reasoning": "Cozy but polished, works with the user's minimal aesthetic"
        },
        {
          "category": "bottom",
          "query": "high waisted black wide leg trousers",
          "reasoning": "Balances the relaxed top, elongates silhouette"
        }
      ]
    }
  ],
  "versatile_pieces": [
    {
      "category": "shoes",
      "query": "white leather low top sneakers minimal",
      "reasoning": "Works across all three outfits, clean and versatile"
    }
  ]
}

Rules:
- Generate 3-4 complete outfits
- Each outfit MUST include shoes - footwear is required for every outfit
- Each outfit should have 3-4 items (minimum 3, ideally 4)
- Add 2-3 versatile pieces that work across outfits (these can include shoes but outfits must have their own)
- Total items should be exactly 12
- Ensure color harmony within each outfit
- Queries should be specific enough for good search results
- Stay within the user's budget range per item
- Categories should be: top, bottom, dress, outerwear, blazer, shoes, bag, jewelry, accessories, denim
- Make queries specific with style descriptors, colors, and fit details
- Example outfit structures:
  * Professional/Office: blazer, top, bottom, SHOES (required)
  * Casual/Weekend: top, bottom, outerwear, SHOES (required)
  * Dress-based: dress, outerwear, bag, SHOES (required)
  * Minimal: top, bottom, SHOES (required)`;

  const avoidancesText = quiz.avoidances.length > 0 ? quiz.avoidances.join(', ') : 'None';
  const mustHavesText = quiz.mustHaves.length > 0 ? quiz.mustHaves.join(', ') : 'All categories welcome';
  const fitPreferenceText = quiz.fitPreference || 'No specific preference';
  const colorPreferencesText = quiz.colorPreferences || 'mixed';
  const brandsText = quiz.favoriteBrands && quiz.favoriteBrands.length > 0 
    ? quiz.favoriteBrands.join(', ') 
    : 'No brand preference';

  const userPrompt = `Style Profile:
- Aesthetics: ${quiz.styles.join(", ")}
- Occasions: ${quiz.occasions.join(", ")}
- Body type: ${quiz.bodyType}
- Fit preference: ${fitPreferenceText}
- Budget per item: ${quiz.budgetRange}
- Color preferences: ${colorPreferencesText}
- Favorite brands: ${brandsText}
- Avoid: ${avoidancesText}
- Must-have categories: ${mustHavesText}

Generate 12 product search queries organized into cohesive outfits.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Try to parse JSON directly
    const text = content.text.trim();
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const outfitStructure = JSON.parse(cleanedText) as OutfitStructure;
    
    // Validate structure
    if (!outfitStructure.outfits || !Array.isArray(outfitStructure.outfits)) {
      throw new Error('Invalid outfit structure: missing outfits array');
    }
    if (!outfitStructure.versatile_pieces || !Array.isArray(outfitStructure.versatile_pieces)) {
      throw new Error('Invalid outfit structure: missing versatile_pieces array');
    }
    
    return outfitStructure;
  } catch (error) {
    // Fallback: try to extract JSON from text
    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const outfitStructure = JSON.parse(jsonMatch[0]) as OutfitStructure;
        return outfitStructure;
      } catch {
        throw new Error('Failed to parse outfit structure from Claude response');
      }
    }
    throw new Error('Failed to parse outfit structure from Claude response');
  }
}
