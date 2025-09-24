
export interface DetectionResult {
  id: string;
  fileName: string;
  fileType: string;
  content: string;
  similarity: number;
  matches: MatchedSentence[];
  timestamp: Date;
  wordCount: number;
  pageCount?: number;
}

export interface MatchedSentence {
  sentence: string;
  similarity: number;
  sourceFile: string;
}

export class PlagiarismDetector {
  private static readonly MIN_SENTENCE_LENGTH = 15;
  private static readonly MIN_WORD_LENGTH = 3;
  private static readonly SIMILARITY_THRESHOLD = 75;

  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = this.getSignificantWords(text1);
    const words2 = this.getSignificantWords(text2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    // Use Jaccard similarity for better accuracy
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return Math.round((intersection.size / union.size) * 100);
  }

  static findDetailedMatches(text: string, existingResults: DetectionResult[]): MatchedSentence[] {
    const sentences = this.extractSentences(text);
    const matches: MatchedSentence[] = [];

    existingResults.forEach(result => {
      const existingSentences = this.extractSentences(result.content);
      
      sentences.forEach(sentence => {
        existingSentences.forEach(existingSentence => {
          const similarity = this.calculateSentenceSimilarity(sentence, existingSentence);
          
          if (similarity >= this.SIMILARITY_THRESHOLD) {
            matches.push({
              sentence: sentence.substring(0, 200) + (sentence.length > 200 ? '...' : ''),
              similarity,
              sourceFile: result.fileName
            });
          }
        });
      });
    });

    // Sort by similarity and return top matches
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  private static getSignificantWords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length >= this.MIN_WORD_LENGTH && 
        !this.isStopWord(word) &&
        /^[a-zA-Z]+$/.test(word)
      );
  }

  private static extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length >= this.MIN_SENTENCE_LENGTH);
  }

  private static calculateSentenceSimilarity(sentence1: string, sentence2: string): number {
    const words1 = this.getSignificantWords(sentence1);
    const words2 = this.getSignificantWords(sentence2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word => words2.includes(word));
    return Math.round((commonWords.length / Math.max(words1.length, words2.length)) * 100);
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  static getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

