import axios from 'axios';

const API_KEY = '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'; // WARNING: Do not expose in production!
const API_URL = 'https://api.deepseek.com/v1/chat/completions'; // Replace with actual DeepSeek endpoint if different

export async function analyzeTextWithDeepSeek(text: string): Promise<string> {
  const response = await axios.post(
    API_URL,
    {
      model: 'deepseek-chat', // or 'DeepSeek V3.1' if that's the model name
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: text }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}
