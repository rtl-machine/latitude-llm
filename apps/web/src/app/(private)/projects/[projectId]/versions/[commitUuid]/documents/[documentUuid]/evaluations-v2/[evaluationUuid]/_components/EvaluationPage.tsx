'use client'
import { useCurrentDocument } from '$/app/providers/DocumentProvider'
import { useCurrentEvaluationV2 } from '$/app/providers/EvaluationV2Provider'
import { EVALUATION_SPECIFICATIONS } from '$/components/evaluations'
import {
  EventArgs,
  useSockets,
} from '$/components/Providers/WebsocketsProvider/useSockets'
import { useCommits } from '$/stores/commitsStore'
import { useEvaluationResultsV2 } from '$/stores/evaluationResultsV2'
import { useEvaluationV2Stats } from '$/stores/evaluationsV2'
import {
  Commit,
  EvaluationMetric,
  EvaluationResultsV2Search,
  evaluationResultsV2SearchToQueryParams,
  EvaluationResultV2,
  EvaluationType,
  EvaluationV2,
  EvaluationV2Stats,
} from '@latitude-data/core/browser'
import { Badge } from '@latitude-data/web-ui/atoms/Badge'
import {
  Breadcrumb,
  BreadcrumbItem,
} from '@latitude-data/web-ui/molecules/Breadcrumb'
import { ClickToCopyUuid } from '@latitude-data/web-ui/organisms/ClickToCopyUuid'
import { Icon } from '@latitude-data/web-ui/atoms/Icons'
import { TableWithHeader } from '@latitude-data/web-ui/molecules/ListingHeader'
import { Text } from '@latitude-data/web-ui/atoms/Text'
import { Tooltip } from '@latitude-data/web-ui/atoms/Tooltip'
import {
  useCurrentCommit,
  useCurrentProject,
} from '@latitude-data/web-ui/providers'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DebouncedState, useDebounce, useDebouncedCallback } from 'use-debounce'
import { EvaluationActions } from './EvaluationActions'
import { EvaluationFilters } from './EvaluationFilters'
import { EvaluationResultsTable } from './EvaluationResultsTable'
import { EvaluationStats } from './EvaluationStats'

const useEvaluationResultsV2Socket = <
  T extends EvaluationType = EvaluationType,
  M extends EvaluationMetric<T> = EvaluationMetric<T>,
>({
  evaluation,
  commits,
  mutate,
  refetchStats,
}: {
  evaluation: EvaluationV2<T, M>
  commits: Record<number, Commit>
  mutate: ReturnType<typeof useEvaluationResultsV2<T, M>>['mutate']
  refetchStats: DebouncedState<
    ReturnType<typeof useEvaluationV2Stats<T, M>>['mutate']
  >
}) => {
  const onMessage = useCallback(
    (args: EventArgs<'evaluationResultV2Created'>) => {
      if (!args) return
      if (args.result.evaluationUuid !== evaluation.uuid) return
      if (!commits[args.result.commitId]) return

      mutate(
        (prev) => [
          {
            ...args.result,
            realtimeAdded: true,
          } as unknown as EvaluationResultV2<T, M>,
          ...(prev ?? []),
        ],
        { revalidate: false },
      )

      setTimeout(() => {
        mutate(
          (prev) =>
            prev?.map((r) => {
              if (r.uuid === args.result.uuid) {
                return { ...r, realtimeAdded: undefined }
              }
              return r
            }),
          { revalidate: false },
        )
      }, 5000)

      refetchStats()
    },
    [evaluation, commits, mutate, refetchStats],
  )

  useSockets({ event: 'evaluationResultV2Created', onMessage })
}

export function EvaluationPage<
  T extends EvaluationType = EvaluationType,
  M extends EvaluationMetric<T> = EvaluationMetric<T>,
>({
  results: serverResults,
  selectedResult: serverSelectedResult,
  stats: serverStats,
  search: serverSearch,
}: {
  results: EvaluationResultV2<T, M>[]
  selectedResult?: EvaluationResultV2<T, M>
  stats?: EvaluationV2Stats
  search: EvaluationResultsV2Search
}) {
  const { project } = useCurrentProject()
  const { commit } = useCurrentCommit()
  const { document } = useCurrentDocument()
  const { evaluation } = useCurrentEvaluationV2<T, M>()

  const typeSpecification = EVALUATION_SPECIFICATIONS[evaluation.type]
  const metricSpecification = typeSpecification.metrics[evaluation.metric]

  const router = useRouter()
  const [search, setSearch] = useState(serverSearch)
  useEffect(() => setSearch(serverSearch), [serverSearch])
  const [debouncedSearch] = useDebounce(search, 500)
  useEffect(() => {
    const currentUrl = window.location.origin + window.location.pathname
    const queryParams = evaluationResultsV2SearchToQueryParams(debouncedSearch)
    const targetUrl = `${currentUrl}?${queryParams}`
    if (targetUrl !== window.location.href) {
      router.replace(targetUrl, { scroll: false })
    }
  }, [debouncedSearch])

  const { data: commitList, isLoading: isLoadingCommits } = useCommits()
  const commits = useMemo(
    () => Object.fromEntries(commitList.map((c) => [c.id, c])),
    [commitList],
  )

  const {
    data: results,
    mutate,
    isLoading: isLoadingResults,
  } = useEvaluationResultsV2<T, M>(
    { project, commit, document, evaluation, search: debouncedSearch },
    { fallbackData: serverResults },
  )

  const [selectedResult, setSelectedResult] = useState(serverSelectedResult)

  const {
    data: stats,
    mutate: mutateStats,
    isLoading: isLoadingStats,
  } = useEvaluationV2Stats<T, M>(
    { project, commit, document, evaluation, search: debouncedSearch },
    { fallbackData: serverStats },
  )
  const refetchStats = useDebouncedCallback(mutateStats, 1000)

  useEvaluationResultsV2Socket({ evaluation, commits, mutate, refetchStats })

  const isLoading = isLoadingResults || isLoadingStats || isLoadingCommits

  return (
    <div className='flex flex-grow min-h-0 flex-col w-full gap-4 p-6'>
      <TableWithHeader
        title={
          <Breadcrumb>
            <BreadcrumbItem>
              <Text.H4M noWrap ellipsis>
                {evaluation.name}
              </Text.H4M>
              <div className='flex flex-row items-center gap-x-2 min-w-0'>
                <Tooltip
                  asChild
                  trigger={
                    <Badge variant='outline' className='truncate'>
                      <span className='truncate'>{typeSpecification.name}</span>
                    </Badge>
                  }
                >
                  {typeSpecification.description}
                </Tooltip>
                <Text.H5 color='foregroundMuted'>/</Text.H5>
                <Tooltip
                  asChild
                  trigger={
                    <Badge variant='outline' className='truncate'>
                      <span className='truncate'>
                        {metricSpecification.name}
                      </span>
                    </Badge>
                  }
                >
                  {metricSpecification.description}
                </Tooltip>
              </div>
              <ClickToCopyUuid uuid={evaluation.uuid} />
            </BreadcrumbItem>
          </Breadcrumb>
        }
        actions={<EvaluationActions />}
      />
      <div className='w-full flex items-center justify-between'>
        <span className='flex items-center gap-x-2'>
          <Text.H4 color='foregroundMuted'>
            A {evaluation.configuration.reverseScale ? 'lower' : 'higher'} score
            is better
          </Text.H4>
          {evaluation.configuration.reverseScale ? (
            <Icon name='arrowDown' color='foregroundMuted' />
          ) : (
            <Icon name='arrowUp' color='foregroundMuted' />
          )}
        </span>
        <EvaluationFilters
          commits={commits}
          search={search}
          setSearch={setSearch}
          isLoading={isLoading}
        />
      </div>
      <div className='min-h-64 h-64 max-h-64'>
        <EvaluationStats stats={stats} isLoading={isLoading} />
      </div>
      <EvaluationResultsTable
        results={results}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
        commits={commits}
        search={search}
        setSearch={setSearch}
        isLoading={isLoading}
      />
    </div>
  )
}
