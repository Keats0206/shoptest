'use client';

import { useState } from 'react';

interface ApiResponse {
  data: any;
  status: number;
  statusText: string;
  error?: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  // Generate Haul form state - new quiz format
  const [generateHaulBody, setGenerateHaulBody] = useState(`{
  "quiz": {
    "styles": ["minimalist", "classic"],
    "occasions": ["work-office", "everyday-casual"],
    "bodyType": "hourglass",
    "fitPreference": "tailored",
    "budgetRange": "$$$",
    "avoidances": [],
    "mustHaves": ["outerwear", "shoes"],
    "colorPreferences": "neutral",
    "favoriteBrands": ["Everlane", "Cuyana"],
    "gender": "female"
  }
}`);

  const testEndpoint = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const body = generateHaulBody;

      const parsedBody = JSON.parse(body);
      const res = await fetch(`/api/generate-haul`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedBody),
      });

      const data = await res.json().catch(() => ({}));

      setResponse({
        data,
        status: res.status,
        statusText: res.statusText,
        error: !res.ok ? data.error || res.statusText : undefined,
      });
    } catch (error: any) {
      setResponse({
        data: null,
        status: 0,
        statusText: 'Error',
        error: error.message || 'Failed to parse request body or execute request',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">API Admin Panel</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Request</h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Request Body (JSON)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGenerateHaulBody(`{
  "quiz": {
    "styles": ["minimalist", "classic"],
    "occasions": ["work-office", "everyday-casual"],
    "bodyType": "hourglass",
    "fitPreference": "tailored",
    "budgetRange": "$$$",
    "avoidances": [],
    "mustHaves": ["outerwear", "shoes"],
    "colorPreferences": "neutral",
    "favoriteBrands": ["Everlane", "Cuyana"],
    "gender": "female"
  }
}`)}
                  className="text-xs px-2 py-1 border border-foreground/20 rounded hover:bg-foreground/5"
                >
                  Load New Format
                </button>
                <button
                  onClick={() => setGenerateHaulBody(`{
  "bodyType": "hourglass",
  "styleVibe": "minimalist",
  "budget": "$$$",
  "shoppingFor": "work-office",
  "colorPreferences": "neutral",
  "gender": "women's",
  "favoriteBrands": ["Everlane", "Cuyana"]
}`)}
                  className="text-xs px-2 py-1 border border-foreground/20 rounded hover:bg-foreground/5"
                >
                  Load Legacy Format
                </button>
              </div>
            </div>
            <textarea
              value={generateHaulBody}
              onChange={(e) => setGenerateHaulBody(e.target.value)}
              className="w-full h-64 p-3 border border-foreground/20 rounded font-mono text-sm bg-background resize-none"
              spellCheck={false}
            />
          </div>

          <button
            onClick={testEndpoint}
            disabled={loading}
            className="w-full px-6 py-3 bg-foreground text-background rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Test Endpoint'}
          </button>
        </div>

        {/* Response Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Response</h2>
          
          {response && (
            <div className="mb-4 space-y-2">
              <div className={`p-2 rounded ${
                response.status >= 200 && response.status < 300
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                  : 'bg-red-500/20 text-red-700 dark:text-red-400'
              }`}>
                <strong>Status:</strong> {response.status} {response.statusText}
              </div>
              {response.error && (
                <div className="p-2 rounded bg-red-500/20 text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {response.error}
                </div>
              )}
              {response.data?.details && (
                <div className="p-2 rounded bg-orange-500/20 text-orange-700 dark:text-orange-400">
                  <strong>Details:</strong> {response.data.details}
                </div>
              )}
            </div>
          )}

          <div className="border border-foreground/20 rounded p-3 bg-background">
            <pre className="text-xs font-mono overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
              {loading ? (
                'Loading...'
              ) : response ? (
                JSON.stringify(response.data, null, 2)
              ) : (
                'Response will appear here...'
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Endpoint Documentation */}
      <div className="mt-8 border-t border-foreground/20 pt-6">
        <h2 className="text-2xl font-semibold mb-4">Endpoint Documentation</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">POST /api/generate-haul</h3>
            <p className="text-sm text-foreground/70 mb-2">
              Generates personalized outfits with products organized into cohesive looks.
            </p>
            
            <div className="bg-foreground/5 p-4 rounded mb-4">
              <p className="text-sm font-semibold mb-2">New Format (Recommended):</p>
              <div className="bg-background p-3 rounded mb-3">
                <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap break-words">
{`{
  "quiz": {
    "styles": ["minimalist", "classic"],
    "occasions": ["work-office", "everyday-casual"],
    "bodyType": "hourglass",
    "fitPreference": "tailored",
    "budgetRange": "$$$",
    "avoidances": [],
    "mustHaves": ["outerwear", "shoes"],
    "colorPreferences": "neutral",
    "favoriteBrands": ["Everlane", "Cuyana"],
    "gender": "female"
  }
}`}
                </pre>
              </div>
              <p className="text-sm font-mono mb-2"><strong>Quiz object fields:</strong></p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><strong>styles</strong> (string[], required): Style aesthetics e.g. ["minimalist", "classic"]</li>
                <li><strong>occasions</strong> (string[], required): Use cases e.g. ["work-office", "everyday-casual"]</li>
                <li><strong>bodyType</strong> (string, required): Body type e.g. "hourglass", "athletic", "petite"</li>
                <li><strong>fitPreference</strong> (string, optional): "fitted", "relaxed", "oversized", "tailored"</li>
                <li><strong>budgetRange</strong> (string, required): "$", "$$", "$$$", "$$$$", "$$$$$"</li>
                <li><strong>avoidances</strong> (string[], optional): Things to avoid</li>
                <li><strong>mustHaves</strong> (string[], optional): Required categories</li>
                <li><strong>colorPreferences</strong> (string, optional): "neutral", "bold", "pastel", "mixed"</li>
                <li><strong>favoriteBrands</strong> (string[], optional): Preferred brands</li>
                <li><strong>gender</strong> (string, optional): "male", "female", "unisex" (defaults to "female")</li>
              </ul>
            </div>

            <div className="bg-foreground/5 p-4 rounded">
              <p className="text-sm font-semibold mb-2">Legacy Format (Backward Compatible):</p>
              <div className="bg-background p-3 rounded mb-3">
                <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap break-words">
{`{
  "bodyType": "hourglass",
  "styleVibe": "minimalist",
  "budget": "$$$",
  "shoppingFor": "work-office",
  "colorPreferences": "neutral",
  "gender": "women's",
  "favoriteBrands": ["Everlane", "Cuyana"]
}`}
                </pre>
              </div>
              <p className="text-xs text-foreground/70 italic mb-2">Note: Legacy format is automatically converted to quiz format</p>
              <p className="text-xs text-foreground/70 italic">Note: Gender can also be specified at the top level (e.g., {"{"}"gender": "female"{"}"}) and will be used for product filtering</p>
            </div>

            <div className="bg-blue-500/10 p-4 rounded mt-4">
              <p className="text-sm font-semibold mb-2">Response Format:</p>
              <div className="bg-background p-3 rounded mb-2">
                <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap break-words">
{`{
  "haulId": "haul_1234567890_abc123",
  "outfits": [
    {
      "name": "Casual Weekend",
      "occasion": "Relaxed brunch or coffee",
      "items": [
        {
          "outfitName": "Casual Weekend",
          "outfitOccasion": "Relaxed brunch or coffee",
          "category": "top",
          "reasoning": "Cozy but polished...",
          "query": "oversized cream cable knit sweater",
          "product": { ... },
          "alternatives": [ ... ]
        }
      ]
    }
  ],
  "versatilePieces": [ ... ],
  "products": [ ... ]  // Flat array for backward compatibility
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
