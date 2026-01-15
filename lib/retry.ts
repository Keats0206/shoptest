/**
 * Retry utility with exponential backoff
 * Retries a function up to maxRetries times with increasing delays
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain error types (e.g., invalid API key, payment required)
      if (error instanceof Error) {
        // Don't retry on authentication errors (401, 403)
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
        // Don't retry on payment required (402)
        if (error.message.includes('402') || error.message.includes('Payment Required')) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      // For rate limits (429), use longer delay
      if (error instanceof Error && error.message.includes('429')) {
        const rateLimitDelay = delay * 2; // Double the delay for rate limits
        console.log(`Rate limited, waiting ${rateLimitDelay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      } else {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError!;
}
