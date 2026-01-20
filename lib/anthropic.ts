import Anthropic from '@anthropic-ai/sdk';
import { retryWithBackoff } from './retry';
import { getEnv } from './env';

export const anthropic = new Anthropic({
  apiKey: getEnv('ANTHROPIC_API_KEY'),
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
  isMain?: boolean; // true for 1-2 main pieces, false for accessory/shoes
}

export interface Outfit {
  name: string;
  occasion: string;
  stylistBlurb: string; // 2-3 sentences explaining why this outfit works together
  items: OutfitItem[];
}

export interface OutfitStructure {
  outfits: Outfit[];
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
  try {
    // Wrap the API call in retry logic
    return await retryWithBackoff(async () => {
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
    }, 2, 1000);
  } catch (error) {
    console.error('Error generating search queries:', error);
    // Convert to user-friendly message
    throw new Error('We\'re having trouble generating your style recommendations. Please try again.');
  }
}

export async function generateProductReason(
  productName: string,
  brand: string,
  profile: StyleProfile
): Promise<string> {
  try {
    // Wrap the API call in retry logic
    return await retryWithBackoff(async () => {
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
    }, 2, 1000);
  } catch (error) {
    console.error('Error generating product reason:', error);
    // Return a fallback reason if generation fails
    return `This piece aligns with your ${profile.styleVibe} style.`;
  }
}

export async function generateOutfitStructure(quiz: QuizData): Promise<OutfitStructure> {
  try {
    // Wrap the API call in retry logic
    return await retryWithBackoff(async () => {
      const systemPrompt = `You are a fashion stylist AI. Generate product search queries for cohesive outfit ideas based on the user's style profile.

Output format:
{
  "outfits": [
    {
      "name": "Casual Weekend",
      "occasion": "Relaxed brunch or coffee",
      "stylistBlurb": "This relaxed weekend look balances comfort with polish. The oversized sweater provides cozy ease while the tailored trousers maintain structure. Paired with minimal sneakers and a classic bag, it's effortless but put-together.",
      "items": [
        {
          "category": "top",
          "query": "oversized cream cable knit sweater",
          "reasoning": "Cozy but polished, works with the user's minimal aesthetic",
          "isMain": true
        },
        {
          "category": "bottom",
          "query": "high waisted black wide leg trousers",
          "reasoning": "Balances the relaxed top, elongates silhouette",
          "isMain": true
        },
        {
          "category": "shoes",
          "query": "white leather low top sneakers minimal",
          "reasoning": "Clean and versatile, keeps the look casual",
          "isMain": false
        },
        {
          "category": "bag",
          "query": "black structured crossbody bag",
          "reasoning": "Adds polish without overwhelming the relaxed vibe",
          "isMain": false
        }
      ]
    }
  ]
}

Rules:
- Generate exactly 6 complete outfit ideas
- Each outfit MUST have exactly 4 items:
  * 1-2 main pieces (top/bottom combination OR dress)
  * 1 accessory (bag, jewelry, or accessories)
  * 1 pair of shoes (required)
- Include a "stylistBlurb" field (2-3 sentences) explaining why this outfit works together and what makes it cohesive
- Total items: 24 across 6 outfits (6 outfits × 4 items each)
- Ensure color harmony within each outfit
- Queries should be specific enough for good search results
- Stay within the user's budget range per item
- Categories should be: top, bottom, dress, outerwear, blazer, shoes, bag, jewelry, accessories, denim
- Mark items with "isMain": true for main pieces (1-2 per outfit), false for accessory/shoes
- Make queries specific with style descriptors, colors, and fit details
- Example outfit structures:
  * Professional/Office: blazer (main), top (main), bottom, SHOES (required), bag
  * Casual/Weekend: top (main), bottom (main), SHOES (required), accessory
  * Dress-based: dress (main), SHOES (required), bag, jewelry
  * Minimal: top (main), bottom (main), SHOES (required), accessory`;

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

Generate exactly 6 outfit ideas with 4 items each (24 total items). Each outfit should have a stylist blurb explaining why it works together.`;

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
        
        // Ensure each outfit has a stylistBlurb
        outfitStructure.outfits = outfitStructure.outfits.map(outfit => ({
          ...outfit,
          stylistBlurb: outfit.stylistBlurb || `This ${outfit.name} look works together through color harmony and complementary silhouettes.`,
        }));
        
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
    }, 2, 1000);
  } catch (error) {
    console.error('Error generating outfit structure:', error);
    // Convert to user-friendly message
    throw new Error('We\'re having trouble generating your style recommendations. Please try again.');
  }
}
