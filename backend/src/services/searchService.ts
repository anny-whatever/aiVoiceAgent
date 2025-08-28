import { ENV } from '../config/env.js';

interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  answer_box?: {
    type: string;
    result?: string;
    snippet?: string;
    snippet_highlighted_words?: string[];
    title?: string;
    link?: string;
    displayed_link?: string;
    thumbnail?: string;
    // Weather specific fields
    temperature?: string;
    unit?: string;
    precipitation?: string;
    humidity?: string;
    wind?: string;
    location?: string;
    date?: string;
    weather?: string;
    // Calculator specific fields
    expression?: string;
    // Knowledge graph fields
    description?: string;
    source?: {
      name: string;
      link: string;
    };
  };
  knowledge_graph?: {
    title?: string;
    type?: string;
    description?: string;
    source?: {
      name: string;
      link: string;
    };
    thumbnail?: string;
  };
  organic_results?: Array<{
    position: number;
    title: string;
    link: string;
    displayed_link: string;
    snippet: string;
    snippet_highlighted_words?: string[];
    source?: string;
  }>;
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
   * Search using Google Direct Answer Box API via SerpAPI
   */
  static async searchWithAIOverview(query: string): Promise<SearchResult> {
    if (!this.SERP_API_KEY) {
      throw new Error('SERP_API_KEY is not configured');
    }

    try {
      console.log('🔍 Searching with Direct Answer Box:', query);
      
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

      return this.processAnswerBoxResponse(data, query);
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
   * Process Direct Answer Box response and extract key information
   */
  private static processAnswerBoxResponse(data: SerpApiResponse, query: string): SearchResult {
    let summary = '';
    let fullContent = '';
    const references: Array<{ title: string; link: string; source: string }> = [];

    // Process Answer Box (primary direct answer)
    if (data.answer_box) {
      const answerBox = data.answer_box;
      
      switch (answerBox.type) {
        case 'calculator_result':
          summary = `The result is: ${answerBox.result}`;
          fullContent = `Calculation: ${answerBox.expression || query} = ${answerBox.result}`;
          break;
          
        case 'weather_result':
          summary = `Weather in ${answerBox.location}: ${answerBox.temperature}°${answerBox.unit}, ${answerBox.weather}. Humidity: ${answerBox.humidity}, Wind: ${answerBox.wind}`;
          fullContent = `Current weather in ${answerBox.location}:\n` +
            `Temperature: ${answerBox.temperature}°${answerBox.unit}\n` +
            `Condition: ${answerBox.weather}\n` +
            `Humidity: ${answerBox.humidity}\n` +
            `Wind: ${answerBox.wind}\n` +
            `Precipitation: ${answerBox.precipitation}\n` +
            `Date: ${answerBox.date}`;
          break;
          
        default:
          // Generic answer box (definitions, facts, etc.)
          if (answerBox.result) {
            summary = answerBox.result;
            fullContent = answerBox.result;
          } else if (answerBox.snippet) {
            summary = answerBox.snippet.length > 200 ? 
              answerBox.snippet.substring(0, 200) + '...' : 
              answerBox.snippet;
            fullContent = answerBox.snippet;
          }
          
          if (answerBox.title && answerBox.link) {
            references.push({
              title: answerBox.title,
              link: answerBox.link,
              source: answerBox.displayed_link || answerBox.link
            });
          }
          break;
      }
    }
    
    // Process Knowledge Graph as fallback
    if (!summary && data.knowledge_graph) {
      const kg = data.knowledge_graph;
      summary = kg.description || `Information about ${kg.title || query}`;
      fullContent = `**${kg.title || 'Knowledge Graph'}**\n${kg.description || 'No description available'}`;
      
      if (kg.source) {
        references.push({
          title: kg.title || 'Knowledge Graph',
          link: kg.source.link,
          source: kg.source.name
        });
      }
    }
    
    // Fallback to organic results if no direct answer
    if (!summary && data.organic_results && data.organic_results.length > 0) {
      const topResult = data.organic_results[0];
      summary = topResult.snippet.length > 200 ? 
        topResult.snippet.substring(0, 200) + '...' : 
        topResult.snippet;
      fullContent = `**${topResult.title}**\n${topResult.snippet}`;
      
      references.push({
        title: topResult.title,
        link: topResult.link,
        source: topResult.displayed_link
      });
      
      // Add additional organic results as references
      data.organic_results.slice(1, 4).forEach(result => {
        references.push({
          title: result.title,
          link: result.link,
          source: result.displayed_link
        });
      });
    }
    
    // Final fallback
    if (!summary) {
      return {
        success: true,
        summary: `I searched for "${query}" but couldn't find a direct answer. Would you like me to search for more specific information?`,
        fullContent: 'No direct answer available for this query.'
      };
    }

    return {
      success: true,
      summary,
      fullContent,
      references: references.length > 0 ? references : undefined
    };
  }

  /**
   * Search for specific information using page token (for follow-up searches)
   */
  static async searchWithPageToken(pageToken: string): Promise<SearchResult> {
    if (!this.SERP_API_KEY) {
      throw new Error('SERP_API_KEY is not configured');
    }

    try {
      const params = new URLSearchParams({
        engine: 'google',
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

      return this.processAnswerBoxResponse(data, 'detailed search');
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