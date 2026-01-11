export interface Channel3Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
  seller?: string;
}

export interface Channel3SearchResponse {
  products: Channel3Product[];
  total?: number;
}

export async function searchProducts(query: string, limit: number = 2): Promise<Channel3Product[]> {
  if (!process.env.CHANNEL3_API_KEY) {
    throw new Error('CHANNEL3_API_KEY is not set');
  }

  const baseUrl = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';
  
  try {
    const response = await fetch(`${baseUrl}/v0/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CHANNEL3_API_KEY,
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!response.ok) {
      let errorText: string;
      try {
        const errorData = await response.json();
        errorText = errorData.detail || JSON.stringify(errorData);
      } catch {
        errorText = await response.text();
      }
      
      console.error(`Channel3 API error for query "${query}":`, response.status, errorText);
      
      // Handle specific error codes with more helpful messages
      if (response.status === 403) {
        console.error('403 Forbidden - Check your CHANNEL3_API_KEY. It may be invalid, expired, or lack permissions.');
        throw new Error(`Channel3 API 403 Forbidden: Check your API key. ${errorText}`);
      }
      if (response.status === 401) {
        throw new Error(`Channel3 API 401 Unauthorized: Invalid API key. ${errorText}`);
      }
      if (response.status === 402) {
        throw new Error(`Channel3 API 402 Payment Required: You have used all free credits. ${errorText}`);
      }
      if (response.status === 429) {
        throw new Error(`Channel3 API 429 Rate Limited: Too many requests. ${errorText}`);
      }
      
      throw new Error(`Channel3 API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Log the actual response structure for debugging
    console.log('Channel3 API response for query:', query, 'Response:', JSON.stringify(data).substring(0, 500));
    
    // Channel3 API returns an array of products directly
    if (Array.isArray(data)) {
      const mapped = data.map((product: any) => {
        // Get the first image from images array, or fall back to deprecated fields
        const firstImage = product.images && product.images.length > 0 
          ? product.images[0].url 
          : (product.image_urls && product.image_urls.length > 0 
            ? product.image_urls[0] 
            : product.image_url || '/placeholder.png');
        
        // Extract price from price object
        const priceObj = product.price || {};
        const price = typeof priceObj === 'object' 
          ? (priceObj.price || 0) 
          : parseFloat(priceObj || '0');
        const currency = typeof priceObj === 'object' 
          ? (priceObj.currency || 'USD') 
          : 'USD';
        
        return {
          id: product.id || String(Math.random()),
          name: product.title || product.name || 'Product',
          brand: product.brand_name || product.brand || 'Unknown Brand',
          image: firstImage,
          price: price,
          currency: currency,
          buyLink: product.url || '#',
          seller: product.seller,
        };
      });
      console.log(`Channel3: Found ${mapped.length} products for query "${query}"`);
      return mapped;
    }

    // If we get here, the response format is unexpected
    console.warn('Channel3 API returned unexpected format:', JSON.stringify(data).substring(0, 500));
    console.warn('Expected: { products: [...] } or [...], but got:', typeof data, Object.keys(data || {}));
    return [];
  } catch (error) {
    console.error('Error searching Channel3 for query:', query, error);
    // Return empty array on error to allow other queries to continue
    // The generate-haul route will handle the case where all queries fail
    return [];
  }
}

