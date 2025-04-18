import { IEventsHandlers } from '../events'
import { createClaimInvitationReferralJob } from './createClaimInvitationReferralJob'
import { createDatasetRowsJob } from './createDatasetRowsJobs'
import { createDocumentLogsFromSpansJob } from './createDocumentLogsFromSpansJob'
import { createLoopsContact } from './createLoopsContact'
import { evaluateLiveLogJob } from './evaluateLiveLog'
import { notifyClientOfBulkCreateTracesAndSpans } from './notifyClientOfBulkCreateTracesAndSpans'
import { notifyClientOfDocumentSuggestionCreated } from './notifyClientOfDocumentSuggestionCreated'
import { notifyClientOfEvaluationResultV2Created } from './notifyClientOfEvaluationResultV2Created'
import { notifyToClientDocumentLogCreatedJob } from './notifyToClientDocumentLogCreatedJob'
import { notifyToClientEvaluationResultCreatedJob } from './notifyToClientEvaluationResultCreatedJob'
import { requestDocumentSuggestionJob } from './requestDocumentSuggestionJob'
import { runLiveEvaluationsJob } from './runLiveEvaluationsJob'
import { sendInvitationToUserJob } from './sendInvitationToUser'
import { sendMagicLinkJob } from './sendMagicLinkHandler'
import { sendReferralInvitationJob } from './sendReferralInvitation'
import { sendSuggestionNotification } from './sendSuggestionNotification'
import { notifyClientOfScaleUpMcpServer } from './notifyClientOfScaleUpMcpServer'
import { notifyClientOfMcpServerConnected } from './notifyClientOfMcpServerConnected'
import { updateWebhookLastTriggeredAt } from './webhooks'

export const EventHandlers: IEventsHandlers = {
  aiProviderCallCompleted: [],
  batchEvaluationRun: [],
  claimReferralInvitations: [createClaimInvitationReferralJob],
  commitCreated: [],
  commitPublished: [],
  datasetCreated: [],
  datasetUploaded: [createDatasetRowsJob],
  documentCreated: [],
  documentLogCreated: [
    runLiveEvaluationsJob,
    evaluateLiveLogJob,
    notifyToClientDocumentLogCreatedJob,
  ],
  documentSuggestionCreated: [
    notifyClientOfDocumentSuggestionCreated,
    sendSuggestionNotification,
  ],
  documentSuggestionApplied: [],
  documentSuggestionDiscarded: [],
  documentRun: [],
  evaluationCreated: [],
  evaluationResultCreated: [
    requestDocumentSuggestionJob,
    notifyToClientEvaluationResultCreatedJob,
  ],
  evaluationResultUpdated: [],
  evaluationRun: [],
  evaluationsConnected: [],
  magicLinkTokenCreated: [sendMagicLinkJob],
  membershipCreated: [sendInvitationToUserJob],
  projectCreated: [],
  providerApiKeyCreated: [],
  providerLogCreated: [],
  sendReferralInvitation: [sendReferralInvitationJob],
  userCreated: [createLoopsContact],
  userInvited: [],
  workspaceCreated: [],
  documentRunRequested: [],
  publicDocumentRunRequested: [],
  chatMessageRequested: [],
  sharedChatMessageRequested: [],
  forkDocumentRequested: [],
  batchEvaluationRunRequested: [],
  runDocumentInBatchRequested: [],
  copilotRefinerGenerated: [],
  copilotRefinerApplied: [],
  copilotSuggestionGenerated: [],
  copilotSuggestionApplied: [],
  bulkCreateTracesAndSpans: [
    notifyClientOfBulkCreateTracesAndSpans,
    createDocumentLogsFromSpansJob,
  ],
  evaluationV2Created: [],
  evaluationV2Ran: [],
  evaluationResultV2Created: [notifyClientOfEvaluationResultV2Created],
  scaleMcpServer: [notifyClientOfScaleUpMcpServer],
  mcpServerConnected: [notifyClientOfMcpServerConnected],
  webhookDeliveryCreated: [updateWebhookLastTriggeredAt],
}
