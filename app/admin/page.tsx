'use client';

import { useState } from 'react';

interface ApiResponse {
  data: any;
  status: number;
  statusText: string;
  error?: string;
}

export default function AdminPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<'generate-haul' | 'shuffle'>('generate-haul');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  // Generate Haul form state
  const [generateHaulBody, setGenerateHaulBody] = useState(`{
  "gender": "women's",
  "bodyType": "hourglass",
  "styleVibe": "minimalist",
  "budget": "mid-range",
  "shoppingFor": "work wardrobe",
  "colorPreferences": "neutrals",
  "favoriteBrands": ["Everlane", "Cuyana"]
}`);

  // Shuffle form state
  const [shuffleBody, setShuffleBody] = useState(`{
  "keptIds": [],
  "count": 12
}`);

  const testEndpoint = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const body = selectedEndpoint === 'generate-haul' 
        ? generateHaulBody 
        : shuffleBody;

      const parsedBody = JSON.parse(body);
      const res = await fetch(`/api/${selectedEndpoint}`, {
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

      {/* Endpoint Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Endpoint</label>
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedEndpoint('generate-haul')}
            className={`px-4 py-2 rounded border ${
              selectedEndpoint === 'generate-haul'
                ? 'bg-foreground text-background'
                : 'bg-background border-foreground/20'
            }`}
          >
            /api/generate-haul
          </button>
          <button
            onClick={() => setSelectedEndpoint('shuffle')}
            className={`px-4 py-2 rounded border ${
              selectedEndpoint === 'shuffle'
                ? 'bg-foreground text-background'
                : 'bg-background border-foreground/20'
            }`}
          >
            /api/shuffle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Request</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Request Body (JSON)
            </label>
            <textarea
              value={selectedEndpoint === 'generate-haul' ? generateHaulBody : shuffleBody}
              onChange={(e) => 
                selectedEndpoint === 'generate-haul'
                  ? setGenerateHaulBody(e.target.value)
                  : setShuffleBody(e.target.value)
              }
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
        
        {selectedEndpoint === 'generate-haul' ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">POST /api/generate-haul</h3>
              <p className="text-sm text-foreground/70 mb-2">
                Generates a personalized product haul based on a style profile.
              </p>
              <div className="bg-foreground/5 p-4 rounded">
                <p className="text-sm font-mono mb-2"><strong>Required fields:</strong></p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>bodyType (string)</li>
                  <li>styleVibe (string)</li>
                  <li>budget (string)</li>
                  <li>shoppingFor (string)</li>
                  <li>colorPreferences (string)</li>
                </ul>
                <p className="text-sm font-mono mt-3 mb-2"><strong>Optional fields:</strong></p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>gender (string, defaults to "women's")</li>
                  <li>favoriteBrands (string[] or string)</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">POST /api/shuffle</h3>
              <p className="text-sm text-foreground/70 mb-2">
                Returns a random selection of fashion products.
              </p>
              <div className="bg-foreground/5 p-4 rounded">
                <p className="text-sm font-mono mb-2"><strong>Optional fields:</strong></p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>keptIds (string[], defaults to [])</li>
                  <li>count (number, defaults to 12)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
