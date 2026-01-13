export interface Channel3Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
  seller?: string;
  materials?: string[];
  key_features?: string[];
  description?: string;
}

export interface Channel3SearchResponse {
  products: Channel3Product[];
  total?: number;
}

export interface Channel3EnrichedProduct {
  id: string;
  url: string;
  title: string;
  price: {
    price: number;
    currency: string;
    compare_at_price?: number;
  };
  availability: string;
  description: string | null;
  brand_id: string | null;
  brand_name: string | null;
  image_urls: string[];
  images: Array<{ url: string }>;
  categories: string[];
  gender: string | null;
  materials: string[] | null;
  key_features: string[] | null;
  variants: any[];
}

export interface SearchFilters {
  gender?: 'male' | 'female' | 'unisex';
  price?: {
    min?: number;
    max?: number;
  };
  availability?: string[];
  brand_ids?: string[];
  category_ids?: string[];
}

export async function searchProducts(
  query: string, 
  limit: number = 2,
  priceMax?: number,
  priceMin?: number,
  filters?: SearchFilters
): Promise<Channel3Product[]> {
  if (!process.env.CHANNEL3_API_KEY) {
    throw new Error('CHANNEL3_API_KEY is not set');
  }

  const baseUrl = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';
  
  try {
    const requestBody: any = {
      query,
      limit: Math.min(limit, 30), // API max is 30
    };
    
    // Build filters object
    const apiFilters: any = {};
    
    // Gender filter - default to female for women's fashion
    if (filters?.gender) {
      apiFilters.gender = filters.gender;
    } else {
      apiFilters.gender = 'female'; // Default to women's products
    }
    
    // Price filter
    if (priceMin !== undefined || priceMax !== undefined || filters?.price) {
      apiFilters.price = {};
      if (priceMin !== undefined || filters?.price?.min !== undefined) {
        apiFilters.price.min = priceMin ?? filters?.price?.min;
      }
      if (priceMax !== undefined || filters?.price?.max !== undefined) {
        apiFilters.price.max = priceMax ?? filters?.price?.max;
      }
    }
    
    // Availability filter - only show in-stock items
    if (filters?.availability) {
      apiFilters.availability = filters.availability;
    } else {
      apiFilters.availability = ['InStock', 'LimitedAvailability']; // Default to available items
    }
    
    // Other filters
    if (filters?.brand_ids) {
      apiFilters.brand_ids = filters.brand_ids;
    }
    if (filters?.category_ids) {
      apiFilters.category_ids = filters.category_ids;
    }
    
    // Add filters to request if any are set
    if (Object.keys(apiFilters).length > 0) {
      requestBody.filters = apiFilters;
    }
    
    const response = await fetch(`${baseUrl}/v0/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CHANNEL3_API_KEY,
      },
      body: JSON.stringify(requestBody),
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
    
    // Channel3 API might return { results: [...] } or an array directly
    let productsArray: any[] = [];
    if (Array.isArray(data)) {
      productsArray = data;
    } else if (data.results && Array.isArray(data.results)) {
      productsArray = data.results;
    } else if (data.products && Array.isArray(data.products)) {
      productsArray = data.products;
    }
    
    if (productsArray.length > 0) {
      const mapped = productsArray.map((product: any) => {
        // Get the first image from images array (new format) or fall back to deprecated fields
        let firstImage = '/placeholder.png';
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          // New format: images is array of objects with url property
          firstImage = product.images[0].url || product.images[0];
        } else if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
          // Deprecated format: image_urls array
          firstImage = product.image_urls[0];
        } else if (product.image_url) {
          // Deprecated format: single image_url
          firstImage = product.image_url;
        }
        
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
          // Include materials and features for validation
          materials: product.materials || undefined,
          key_features: product.key_features || undefined,
          description: product.description || undefined,
        };
      });
      console.log(`Channel3: Found ${mapped.length} products for query "${query}"`);
      return mapped;
    }

    // If we get here, the response format is unexpected
    console.warn('Channel3 API returned unexpected format:', JSON.stringify(data).substring(0, 500));
    console.warn('Expected: { results: [...] }, { products: [...] } or [...], but got:', typeof data, Object.keys(data || {}));
    return [];
  } catch (error) {
    console.error('Error searching Channel3 for query:', query, error);
    // Return empty array on error to allow other queries to continue
    // The generate-haul route will handle the case where all queries fail
    return [];
  }
}

export async function enrichProduct(url: string): Promise<Channel3EnrichedProduct | null> {
  if (!process.env.CHANNEL3_API_KEY) {
    throw new Error('CHANNEL3_API_KEY is not set');
  }

  const baseUrl = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';
  
  try {
    const response = await fetch(`${baseUrl}/v0/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CHANNEL3_API_KEY,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorText: string;
      try {
        const errorData = await response.json();
        errorText = errorData.detail || JSON.stringify(errorData);
      } catch {
        errorText = await response.text();
      }
      
      console.error(`Channel3 enrich API error for url "${url}":`, response.status, errorText);
      
      if (response.status === 403) {
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
    return data as Channel3EnrichedProduct;
  } catch (error) {
    console.error('Error enriching product from Channel3:', url, error);
    return null;
  }
}
