import type { Message } from '@latitude-data/compiler'
import {
  buildResponseMessage,
  ChainStepResponse,
  StreamType,
} from '@latitude-data/constants'
import { parseISO } from 'date-fns'
import {
  DEFAULT_PAGINATION_SIZE,
  type CsvData,
  type DateRange,
} from './constants'
import { type QueryParams } from './lib'
import type { ProviderLogDto } from './schema/types'

export function buildCsvFile(csvData: CsvData, name: string): File {
  const headers = csvData.headers.map((h) => JSON.stringify(h)).join(',')
  const rows = csvData.data.map((row) => Object.values(row.record).join(','))
  const csv = [headers, ...rows].join('\n')
  return new File([csv], `${name}.csv`, { type: 'text/csv' })
}

export function buildMessagesFromResponse<T extends StreamType>({
  response,
}: {
  response: ChainStepResponse<T>
}) {
  const type = response.streamType
  const message =
    type === 'object'
      ? buildResponseMessage<'object'>({
          type: 'object',
          data: {
            object: response.object,
            text: response.text,
          },
        })
      : type === 'text'
        ? buildResponseMessage<'text'>({
            type: 'text',
            data: { text: response.text, toolCalls: response.toolCalls },
          })
        : undefined

  return message ? ([message] as Message[]) : []
}

export function buildAllMessagesFromResponse<T extends StreamType>({
  response,
}: {
  response: ChainStepResponse<T>
}) {
  const previousMessages = response.providerLog?.messages ?? []
  const messages = buildMessagesFromResponse({ response })

  return [...previousMessages, ...messages]
}

export function buildConversation(providerLog: ProviderLogDto) {
  let messages: Message[] = [...providerLog.messages]

  const message = buildResponseMessage({
    type: 'text',
    data: {
      text: providerLog.response,
      toolCalls: providerLog.toolCalls,
    },
  })

  if (message) {
    messages.push(message)
  }

  return messages
}

export function formatMessage(message: Message) {
  let result = ''

  if (typeof message.content === 'string') {
    result = message.content
  } else {
    result = message.content
      .map((content) => {
        switch (content.type) {
          case 'text':
            return content.text
          case 'image':
            if (typeof content.image === 'string') {
              try {
                return new URL(content.image).toString()
              } catch {
                return '[IMAGE]'
              }
            }
            return '[IMAGE]'
          case 'file':
            if (typeof content.file === 'string') {
              try {
                return new URL(content.file).toString()
              } catch {
                return '[FILE]'
              }
            }
            return '[FILE]'
          case 'tool-call':
            try {
              return JSON.stringify(content)
            } catch {
              return '[TOOL CALL]'
            }
          case 'tool-result':
            try {
              return JSON.stringify(content)
            } catch {
              return '[TOOL RESULT]'
            }
        }
      })
      .join('\n')
  }

  return result
}

export function formatConversation(conversation: Message[]) {
  let result = ''

  for (const message of conversation) {
    const speaker = message.role.charAt(0).toUpperCase() + message.role.slice(1)
    result += `${speaker}: ${formatMessage(message)}\n\n`
  }

  return result
}

export type EvaluationResultsV2Search = {
  filters?: {
    commitIds?: number[]
    createdAt?: DateRange
  }
  orders?: {
    recency?: 'asc' | 'desc'
  }
  pagination: {
    page: number
    pageSize: number
    resultUuid?: string
  }
}

export function evaluationResultsV2SearchFromQueryParams(params: QueryParams) {
  const search = {
    filters: {},
    orders: {
      recency: 'desc',
    },
    pagination: {
      page: 1,
      pageSize: DEFAULT_PAGINATION_SIZE,
    },
  } as EvaluationResultsV2Search

  if (params.commitIds && typeof params.commitIds === 'string') {
    search.filters!.commitIds = [...new Set(params.commitIds.split(','))]
      .filter(Boolean)
      .map(Number)
  }

  if (params.fromCreatedAt && typeof params.fromCreatedAt === 'string') {
    search.filters!.createdAt = {
      ...(search.filters!.createdAt ?? {}),
      from: parseISO(params.fromCreatedAt),
    }
  }

  if (params.toCreatedAt && typeof params.toCreatedAt === 'string') {
    search.filters!.createdAt = {
      ...(search.filters!.createdAt ?? {}),
      to: parseISO(params.toCreatedAt),
    }
  }

  if (params.recency && params.recency === 'asc') {
    search.orders!.recency = 'asc'
  }

  if (params.recency && params.recency === 'desc') {
    search.orders!.recency = 'desc'
  }

  if (params.page && typeof params.page === 'string') {
    search.pagination.page = Number(params.page)
  }

  if (params.pageSize && typeof params.pageSize === 'string') {
    search.pagination.pageSize = Number(params.pageSize)
  }

  if (params.resultUuid && typeof params.resultUuid === 'string') {
    search.pagination.resultUuid = params.resultUuid
  }

  return search
}

export function evaluationResultsV2SearchToQueryParams(
  search: EvaluationResultsV2Search,
) {
  const params = new URLSearchParams()

  if (search.filters?.commitIds?.length) {
    const commitIds = [...new Set(search.filters?.commitIds)].filter(Boolean)
    params.set('commitIds', commitIds.join(','))
  }

  if (search.filters?.createdAt?.from) {
    params.set('fromCreatedAt', search.filters.createdAt.from.toISOString())
  }

  if (search.filters?.createdAt?.to) {
    params.set('toCreatedAt', search.filters.createdAt.to.toISOString())
  }

  if (search.orders?.recency === 'asc') {
    params.set('recency', 'asc')
  }

  if (search.orders?.recency === 'desc') {
    params.set('recency', 'desc')
  }

  params.set('page', String(search.pagination.page))
  params.set('pageSize', String(search.pagination.pageSize))

  if (search.pagination.resultUuid) {
    params.set('resultUuid', search.pagination.resultUuid)
  }

  return params.toString()
}
