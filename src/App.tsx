import React, { useState, useRef } from 'react';
import { Upload, FileText, File, AlertCircle, CheckCircle, Clock, Trash2, FileX, Info } from 'lucide-react';
import { PDFExtractor } from './util/pdfEXtractor';
import { PlagiarismDetector, DetectionResult } from './util/plagiarismDetector';

function App() {
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromFile = async (file: File): Promise<{ text: string; pageCount?: number }> => {
    if (file.type === 'application/pdf') {
      const result = await PDFExtractor.extractText(file);
      return { text: result.text, pageCount: result.pageCount };
    } else if (file.type === 'text/plain') {
      const text = await PDFExtractor.extractFromTXT(file);
      return { text };
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { text: content, pageCount } = await extractTextFromFile(file);
      
      if (content.length < 50) {
        throw new Error('File content is too short for meaningful plagiarism detection.');
      }

      const similarity = results.length > 0 
        ? Math.max(...results.map(result => PlagiarismDetector.calculateSimilarity(content, result.content)))
        : 0;

      const matches = PlagiarismDetector.findDetailedMatches(content, results);
      const wordCount = PlagiarismDetector.getWordCount(content);

      const newResult: DetectionResult = {
        id: Date.now().toString(),
        fileName: file.name,
        fileType: file.type,
        content,
        similarity,
        matches,
        timestamp: new Date(),
        wordCount,
        pageCount
      };

      setResults(prev => [newResult, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity < 20) return 'text-green-600';
    if (similarity < 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityBg = (similarity: number): string => {
    if (similarity < 20) return 'bg-green-100 border-green-200';
    if (similarity < 50) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <File className="w-5 h-5 text-red-500" />;
    } else if (fileType === 'text/plain') {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else {
      return <FileX className="w-5 h-5 text-gray-500" />;
    }
  };

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  };

  const clearAll = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Plagiarism Detection Tool
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your documents (PDF or TXT) to check for plagiarism and content similarity. 
            Our advanced detection algorithm compares your content against previously uploaded documents.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Supported Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>PDF files up to 20MB (including complex layouts and mini PDFs)</li>
                  <li>Text files (.txt) up to 20MB</li>
                  <li>Advanced similarity detection with sentence-level matching</li>
                  <li>Automatic text cleaning and optimization</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload Document</h3>
              <p className="text-gray-500 mb-6">
                Choose a PDF or TXT file to check for plagiarism
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? (
                  <>
                    <Clock className="w-5 h-5 inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Select File'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        {results.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Detection Results ({results.length})
            </h2>
            <button
              onClick={clearAll}
              className="text-red-600 hover:text-red-700 font-medium flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
        )}

        {/* Results */}
        <div className="space-y-6">
          {results.map((result) => (
            <div key={result.id} className={`bg-white rounded-xl shadow-lg border-2 ${getSimilarityBg(result.similarity)} overflow-hidden`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getFileIcon(result.fileType)}
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{result.fileName}</h3>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Uploaded {result.timestamp.toLocaleString()}</p>
                        <p>{result.wordCount.toLocaleString()} words{result.pageCount ? ` • ${result.pageCount} pages` : ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl font-bold ${getSimilarityColor(result.similarity)}`}>
                      {result.similarity}%
                    </div>
                    <button
                      onClick={() => deleteResult(result.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  {result.similarity < 20 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <span className={`font-medium ${getSimilarityColor(result.similarity)}`}>
                    {result.similarity < 20 ? 'Low Similarity' : 
                     result.similarity < 50 ? 'Medium Similarity' : 'High Similarity'}
                  </span>
                </div>

                {result.matches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Potential Matches ({result.matches.length}):
                    </h4>
                    <div className="space-y-2">
                      {result.matches.map((match: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-medium text-orange-600">
                              {match.similarity}% similarity with {match.sourceFile}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">"{match.sentence}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Document Content Preview:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.content.substring(0, 300)}
                      {result.content.length > 300 && '...'}
                    </p>
                  </div>
                  {result.content.length > 300 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Showing first 300 characters of {result.content.length.toLocaleString()} total
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-500 mb-2">No documents uploaded yet</h3>
            <p className="text-gray-400">Upload your first document to start detecting plagiarism</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;