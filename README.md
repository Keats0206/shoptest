# ShopPal - AI-Powered Personal Styling App

**ShopPal** is an MVP that validates whether AI can give personalized fashion recommendations that people actually want. Built with Next.js 14+, TypeScript, Tailwind CSS, Anthropic (Claude), and Channel3 API.

## Features

- 🎨 **Style Quiz** - 7-question mobile-first form to capture style preferences
- 🤖 **AI Recommendations** - Claude-powered search query generation
- 🛍️ **Product Discovery** - Channel3 API integration for product search
- 📱 **Mobile-First** - Optimized for iPhone and mobile devices
- ⚡ **Fast & Modern** - Clean, minimalist aesthetic inspired by Reformation and Everlane

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: Anthropic Claude API
- **Products**: Channel3 API
- **Deployment**: Vercel (one-click deploy)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Channel3 API key ([sign up here](https://trychannel3.com/))

### Installation

1. **Clone and install dependencies:**

```bash
npm install
# Install Anthropic SDK if not already installed
npm install @anthropic-ai/sdk
```

2. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```bash
# Anthropic API Key for Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Channel3 API Key for product search
CHANNEL3_API_KEY=your_channel3_api_key_here

# Optional: Channel3 API URL (defaults to https://api.trychannel3.com)
# CHANNEL3_API_URL=https://api.trychannel3.com
```

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Project Structure

```
/app
  /page.tsx              # Home page with quiz
  /haul/page.tsx         # Results page
  /api
    /generate-haul       # Main API route - generates recommendations
    /search-products     # Channel3 product search endpoint
/components
  QuizForm.tsx          # Style quiz component
  ProductCard.tsx       # Individual product display
  HaulGrid.tsx          # Product grid layout
/lib
  anthropic.ts          # Claude API client
  channel3.ts           # Channel3 API client
```

## How It Works

1. **User takes the quiz** (`/`) - Answers 7 questions about style preferences
2. **AI generates queries** - Claude creates 3-4 specific product search queries
3. **Products are fetched** - Channel3 API returns matching products (6-8 total)
4. **AI adds context** - Claude generates personalized "why we picked this" reasons
5. **Results displayed** (`/haul`) - Products shown in a beautiful grid with affiliate links

## API Integration

### Anthropic (Claude)

The app uses Claude to:
- Generate diverse product search queries based on style profile
- Create personalized reasons for each product recommendation

### Channel3

The app uses Channel3 to:
- Search for products using AI-generated queries
- Retrieve product details (name, image, price, brand, affiliate link)
- Handle multiple sellers and price comparison

**Note**: Channel3 API structure may vary. Update `/lib/channel3.ts` based on actual API documentation from [docs.trychannel3.com](https://docs.trychannel3.com).

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `CHANNEL3_API_KEY`
4. Deploy!

The app is optimized for Vercel with:
- Edge/Node.js runtime support
- Automatic TypeScript compilation
- Optimized builds for production

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude |
| `CHANNEL3_API_KEY` | Yes | Your Channel3 API key for product search |
| `CHANNEL3_API_URL` | No | Channel3 API base URL (defaults to https://api.trychannel3.com) |

## Testing the Hypothesis

This MVP is designed to validate:
- **Do people engage with AI-generated style recommendations?**
- **Are the recommendations actually useful?**
- **Does the UX feel delightful and personal?**

Track engagement through:
- Quiz completion rates
- Product click-through rates
- Time spent on results page
- Return visits

## Limitations & Future Improvements

This MVP intentionally excludes:
- User accounts
- Email digests
- Favorites/save functionality
- Social sharing
- Gamification

For production, consider adding:
- Database for haul persistence
- User authentication
- Analytics integration
- Error monitoring
- Product caching
- Rate limiting

## License

Private project - All rights reserved

## Support

For issues or questions, please refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Channel3 Documentation](https://docs.trychannel3.com/)
# shoptest
