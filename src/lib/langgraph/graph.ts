import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, END, START } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { Annotation } from '@langchain/langgraph'
import type { AnalysisState, AnalystQuestion } from './types'
import { 
  guardAndRoute, 
  loadContextAndMartSummary, 
  parseAnalystQuestions,
  removeAnalystQuestionsSection,
  persistResults 
} from './nodes'
import { buildSystemPrompt, buildUserPrompt } from './prompts'

// State annotation for LangGraph
const AnalysisStateAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  projectId: Annotation<string>(),
  workspaceId: Annotation<string>(),
  role: Annotation<AnalysisState['role']>(),
  language: Annotation<'ko' | 'en'>(),
  projectProfile: Annotation<AnalysisState['projectProfile']>(),
  workspacePurpose: Annotation<AnalysisState['workspacePurpose']>(),
  agentConfig: Annotation<AnalysisState['agentConfig']>(),
  mode: Annotation<'report' | 'chat'>(),
  range: Annotation<AnalysisState['range']>(),
  userMessage: Annotation<string | undefined>(),
  threadId: Annotation<string>(),
  martSummary: Annotation<AnalysisState['martSummary']>(),
  analysisMarkdown: Annotation<string | undefined>(),
  analystQuestions: Annotation<AnalystQuestion[] | undefined>(),
  dataAccessed: Annotation<string[]>(),
  error: Annotation<string | undefined>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

type StateType = typeof AnalysisStateAnnotation.State

// Create the graph
export function createAnalysisGraph() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    streaming: true,
  })

  const graph = new StateGraph(AnalysisStateAnnotation)
    // Node 0: Guard
    .addNode('guard', async (state: StateType) => {
      const result = await guardAndRoute(state as AnalysisState)
      return result
    })
    
    // Node 1: Load Context
    .addNode('load_context', async (state: StateType) => {
      const result = await loadContextAndMartSummary(state as AnalysisState)
      return result
    })
    
    // Node 2: LLM Generate
    .addNode('generate', async (state: StateType) => {
      if (!state.martSummary) {
        return { error: 'No mart summary available' }
      }

      const systemPrompt = buildSystemPrompt(
        state.language,
        state.workspacePurpose,
        state.projectProfile,
        state.mode
      )
      
      const userPrompt = buildUserPrompt(
        state.mode,
        state.martSummary,
        state.userMessage
      )

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]

      const response = await model.invoke(messages)
      const rawContent = typeof response.content === 'string' 
        ? response.content 
        : response.content.map(c => 'text' in c ? c.text : '').join('')

      // 질문 파싱 (원본에서)
      const questions = parseAnalystQuestions(rawContent)
      
      // 마크다운에서 Analyst Questions 섹션 제거 (UI에서 별도 렌더링)
      const cleanedMarkdown = removeAnalystQuestionsSection(rawContent)

      return {
        analysisMarkdown: cleanedMarkdown,
        analystQuestions: questions,
        messages: [response],
      }
    })
    
    // Node 3: Persist
    .addNode('persist', async (state: StateType) => {
      if (state.analysisMarkdown && state.analystQuestions) {
        await persistResults(
          state as AnalysisState,
          state.analysisMarkdown,
          state.analystQuestions,
          state.martSummary // 차트 데이터용
        )
      }
      return {}
    })
    
    // Edges
    .addEdge(START, 'guard')
    .addConditionalEdges('guard', (state: StateType) => {
      return state.error ? END : 'load_context'
    })
    .addConditionalEdges('load_context', (state: StateType) => {
      return state.error ? END : 'generate'
    })
    .addEdge('generate', 'persist')
    .addEdge('persist', END)

  return graph.compile()
}

// Streaming 실행 함수
export async function* runAnalysisStream(
  input: Omit<AnalysisState, 'dataAccessed' | 'messages'>
) {
  const graph = createAnalysisGraph()
  
  const initialState = {
    ...input,
    dataAccessed: [],
    messages: [],
  }

  // 스트리밍 실행
  const stream = await graph.stream(initialState, {
    streamMode: 'values',
  })

  for await (const state of stream) {
    yield state as StateType
  }
}

// Non-streaming 실행 함수
export async function runAnalysis(
  input: Omit<AnalysisState, 'dataAccessed' | 'messages'>
): Promise<StateType> {
  const graph = createAnalysisGraph()
  
  const initialState = {
    ...input,
    dataAccessed: [],
    messages: [],
  }

  const result = await graph.invoke(initialState)
  return result as StateType
}
