import { Message } from '@/types/chat';
import { GoogleBody, GoogleSource } from '@/types/google';
import { getProviderApiHost, getProviderEnvKey } from '@/types/provider';
import endent from 'endent';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const { messages, model, provider, key, tavilyApiKey } =
      req.body as GoogleBody;

    const userMessage = messages[messages.length - 1];

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey ? tavilyApiKey : process.env.TAVILY_API_KEY,
        query: userMessage.content.trim(),
        max_results: 5,
        search_depth: 'advanced',
      }),
    });

    const tavilyData = await tavilyRes.json();

    const sources: GoogleSource[] = (tavilyData.results || []).map(
      (item: any) => ({
        title: item.title,
        link: item.url,
        content: item.content || '',
      }),
    );

    if (!sources.length) {
      return res.status(200).json({
        answer:
          'I could not find any relevant results online for that query. Try rephrasing it, or ask me again without web search enabled.',
      });
    }

    const answerPrompt = endent`
    Provide me with the information I requested. Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as a markdown link as you use them at the end of each sentence by number of the source (ex: [[1]](link.com)). Provide an accurate response and then stop. Today's date is ${new Date().toLocaleDateString()}.

    Example Input:
    What's the weather in San Francisco today?

    Example Sources:
    [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)

    Example Response:
    It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)

    Input:
    ${userMessage.content.trim()}

    Sources:
    ${sources.map((source) => {
      return endent`
      ${source.title} (${source.link}):
      ${source.content}
      `;
    })}

    Response:
    `;

    const answerMessage: Message = { role: 'user', content: answerPrompt };

    const apiKey =
      key || provider?.apiKey || getProviderEnvKey(provider?.id) || '';

    if (!apiKey) {
      return res.status(500).json({
        message:
          'No API key available for the selected provider. Set your API key in the sidebar or add a server environment variable.',
      });
    }

    const apiHost = getProviderApiHost(
      provider || { id: 'openai', apiHost: '' },
    );

    const answerRes = await fetch(`${apiHost}/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider?.id === 'openai' && process.env.OPENAI_ORGANIZATION && {
          'OpenAI-Organization': process.env.OPENAI_ORGANIZATION,
        }),
      },
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: `Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as [1](link), etc, as you use them.`,
          },
          answerMessage,
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!answerRes.ok) {
      const errorText = (await answerRes.text()).slice(0, 300);
      return res.status(502).json({
        message: `The AI provider returned an error while answering the search results: ${errorText}`,
      });
    }

    const { choices } = await answerRes.json();
    const answer =
      choices[0]?.message?.content || sources[0].content || 'No answer.';

    res.status(200).json({ answer });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;