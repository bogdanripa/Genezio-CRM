import fs from 'fs';
import { ChatOpenAI } from '@langchain/openai';
import { JsonSpec } from 'langchain/tools';
import { OpenApiToolkit } from 'langchain/agents';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

class SmartAgent {
  constructor() {
    const raw = fs.readFileSync('./swagger.json', 'utf8');
    const parsed = JSON.parse(raw);
    const jsonSpec = new JsonSpec(parsed);

    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const toolkit = new OpenApiToolkit(jsonSpec, llm);
    const tools = toolkit.getTools();

    const systemPrompt = `You are a helpful assistant that uses external tools (API endpoints) to answer user questions. Use the tools provided to gather information or perform actions. If a task requires multiple steps, plan and execute them in order.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('agent_scratchpad'),
      ['human', '{input}'],
    ]);

    const agent = createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    this.executor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      streamRunnable: false,
    });
  }

  async invoke(input) {
    const response = await this.executor.invoke({ input });
    return response;
  }
}

export default SmartAgent;