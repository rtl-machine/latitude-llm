import { ReactNode } from 'react'

import { SessionProvider } from '@latitude-data/web-ui/browser'
import buildMetatags from '$/app/_lib/buildMetatags'
import { createSupportUserIdentity } from '$/app/(private)/_lib/createSupportUserIdentity'
import { SupportChat } from '$/components/IntercomSupportChat'
import { AppLayout } from '$/components/layouts'
import {
  LatitudeWebsocketsProvider,
  SocketIOProvider,
} from '$/components/Providers/WebsocketsProvider'
import env from '$/env'
import { getCurrentUser } from '$/services/auth/getCurrentUser'
import { getSession } from '$/services/auth/getSession'
import { ROUTES } from '$/services/routes'
import { redirect } from 'next/navigation'

import { CSPostHogProvider, IdentifyUser } from '../providers'
import { NAV_LINKS } from './_lib/constants'
import { FeatureFlagProvider } from '$/components/Providers/FeatureFlags'
import { getFeatureFlagsForWorkspaceCached } from '$/components/Providers/FeatureFlags/getFeatureFlagsForWorkspace'

export const metadata = buildMetatags({
  title: 'Home',
})

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const data = await getSession()
  if (!data.session) return redirect(ROUTES.auth.login)

  const { workspace, user, subscriptionPlan } = await getCurrentUser()
  if (!user) return redirect(ROUTES.auth.login)

  const supportIdentity = createSupportUserIdentity(user)
  const featureFlags = getFeatureFlagsForWorkspaceCached({ workspace })
  const cloudInfo =
    env.LATITUDE_CLOUD && env.LATITUDE_CLOUD_PAYMENT_URL
      ? { paymentUrl: env.LATITUDE_CLOUD_PAYMENT_URL }
      : undefined
  return (
    <CSPostHogProvider>
      <IdentifyUser user={user} workspace={workspace}>
        <SupportChat identity={supportIdentity} />
        <SocketIOProvider>
          <SessionProvider
            currentUser={user}
            workspace={workspace}
            subscriptionPlan={subscriptionPlan}
          >
            <FeatureFlagProvider featureFlags={featureFlags}>
              <LatitudeWebsocketsProvider
                workspace={workspace}
                socketServer={env.WEBSOCKETS_SERVER}
              >
                <AppLayout
                  currentUser={user}
                  navigationLinks={NAV_LINKS}
                  cloudInfo={cloudInfo}
                >
                  {children}
                </AppLayout>
              </LatitudeWebsocketsProvider>
            </FeatureFlagProvider>
          </SessionProvider>
        </SocketIOProvider>
      </IdentifyUser>
    </CSPostHogProvider>
  )
}
