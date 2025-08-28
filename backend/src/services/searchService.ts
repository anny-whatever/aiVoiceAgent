import { ENV } from '../config/env.js';

interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  ai_overview?: {
    text_blocks: Array<{
      type: 'heading' | 'paragraph' | 'list' | 'expandable' | 'comparison';
      snippet: string;
      reference_indexes?: number[];
      list?: Array<{
        snippet: string;
        title?: string;
        reference_indexes?: number[];
      }>;
    }>;
    references?: Array<{
      title: string;
      link: string;
      snippet: string;
      source: string;
      index: number;
    }>;
  };
  error?: string;
}

interface SearchResult {
  success: boolean;
  summary: string;
  fullContent?: string;
  references?: Array<{
    title: string;
    link: string;
    source: string;
  }>;
  error?: string;
}

export class SearchService {
  private static readonly SERP_API_KEY = ENV.SERP_API_KEY;
  private static readonly SERP_BASE_URL = 'https://serpapi.com/search.json';

  /**
   * Search using Google AI Overview API via SerpAPI
   */
  static async searchWithAIOverview(query: string): Promise<SearchResult> {
    if (!this.SERP_API_KEY) {
      throw new Error('SERP_API_KEY is not configured');
    }

    try {
      console.log('🔍 Searching with AI Overview:', query);
      
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: this.SERP_API_KEY,
        hl: 'en',
        gl: 'us'
      });

      const response = await fetch(`${this.SERP_BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
      }

      const data: SerpApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(`SerpAPI error: ${data.error}`);
      }

      if (data.search_metadata.status !== 'Success') {
        throw new Error(`Search failed with status: ${data.search_metadata.status}`);
      }

      return this.processAIOverviewResponse(data, query);
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        success: false,
        summary: 'Sorry, I encountered an error while searching for that information.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process AI Overview response and extract key information
   */
  private static processAIOverviewResponse(data: SerpApiResponse, query: string): SearchResult {
    if (!data.ai_overview || !data.ai_overview.text_blocks) {
      return {
        success: true,
        summary: `I searched for "${query}" but didn't find a comprehensive AI overview. Would you like me to search for more specific information?`,
        fullContent: 'No AI overview available for this query.'
      };
    }

    const { text_blocks, references } = data.ai_overview;
    
    // Extract summary (first 2-4 sentences)
    const summaryParts: string[] = [];
    const fullContentParts: string[] = [];
    
    for (const block of text_blocks) {
      if (block.type === 'paragraph' && block.snippet) {
        const sentences = block.snippet.split(/[.!?]+/).filter(s => s.trim().length > 0);
        summaryParts.push(...sentences.slice(0, 2).map(s => s.trim() + '.'));
        fullContentParts.push(block.snippet);
      } else if (block.type === 'heading' && block.snippet) {
        fullContentParts.push(`\n**${block.snippet}**`);
      } else if (block.type === 'list' && block.list) {
        const listItems = block.list.slice(0, 3).map(item => 
          item.title ? `• ${item.title}: ${item.snippet}` : `• ${item.snippet}`
        );
        if (summaryParts.length < 3) {
          summaryParts.push(...listItems.slice(0, 2));
        }
        fullContentParts.push(...listItems);
      }
      
      // Limit summary to 4 key points
      if (summaryParts.length >= 4) break;
    }

    const summary = summaryParts.slice(0, 4).join(' ');
    const fullContent = fullContentParts.join('\n');
    
    // Process references
    const processedReferences = references?.slice(0, 5).map(ref => ({
      title: ref.title,
      link: ref.link,
      source: ref.source
    }));

    return {
      success: true,
      summary: summary || `I found information about "${query}". Would you like me to provide more details?`,
      fullContent,
      references: processedReferences
    };
  }

  /**
   * Search for specific AI Overview using page token (for follow-up searches)
   */
  static async searchWithPageToken(pageToken: string): Promise<SearchResult> {
    if (!this.SERP_API_KEY) {
      throw new Error('SERP_API_KEY is not configured');
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_ai_overview',
        page_token: pageToken,
        api_key: this.SERP_API_KEY
      });

      const response = await fetch(`${this.SERP_BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
      }

      const data: SerpApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(`SerpAPI error: ${data.error}`);
      }

      return this.processAIOverviewResponse(data, 'detailed search');
    } catch (error) {
      console.error('❌ Page token search error:', error);
      return {
        success: false,
        summary: 'Sorry, I encountered an error while fetching detailed information.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}