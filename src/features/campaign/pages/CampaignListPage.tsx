/**
 * Campaign List Page - nouvelle mise en page
 */

import React, { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Calendar, List } from 'lucide-react'
import {
  AppLayout,
  PageHeader,
  Section,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Breadcrumb
} from '@/shared/ui/components'
import { CampaignList, CampaignScheduler } from '../components'
import type { Campaign, ScheduledEvent, CreateCampaignData } from '../types'

type CampaignTab = 'list' | 'scheduler'

export function CampaignListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const activeTab: CampaignTab = useMemo(() => {
    const param = searchParams.get('tab')
    return param === 'scheduler' ? 'scheduler' : 'list'
  }, [searchParams])

  const siteId = searchParams.get('siteId') ? Number(searchParams.get('siteId')) : undefined
  const machineId = searchParams.get('machineId') ? Number(searchParams.get('machineId')) : undefined
  const installationId = searchParams.get('installationId') ? Number(searchParams.get('installationId')) : undefined

  const updateTab = (tab: CampaignTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    })
  }

  const handleCampaignSelect = (campaign: Campaign) => {
    navigate(`/campaigns/${campaign.id}`)
  }

  const handleCampaignCreate = (_data: CreateCampaignData) => {
    // Les mutations sont gérées dans la liste, rien à faire ici pour le moment.
  }

  const handleEventSelect = (event: ScheduledEvent) => {
    navigate(`/campaigns/${event.campaignId}`)
  }

  return (
    <AppLayout title="Campagnes GNSS">
      <PageHeader
        title="Campagnes GNSS"
        description="Gérez vos campagnes de mesure et planifiez vos opérations GNSS."
        breadcrumb={(
          <Breadcrumb
            items={[
              { label: 'Campagnes', current: true }
            ]}
          />
        )}
      />

      <Section>
        <Tabs value={activeTab} onValueChange={tab => updateTab(tab as CampaignTab)}>
          <TabsList className="grid grid-cols-2 w-full md:w-auto">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Liste des campagnes
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Planification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <CampaignList
              siteId={siteId}
              machineId={machineId}
              installationId={installationId}
              onCampaignSelect={handleCampaignSelect}
              onCampaignCreate={handleCampaignCreate}
            />
          </TabsContent>

          <TabsContent value="scheduler" className="mt-6">
            <CampaignScheduler
              siteId={siteId}
              machineId={machineId}
              onEventSelect={handleEventSelect}
              view="calendar"
            />
          </TabsContent>
        </Tabs>
      </Section>
    </AppLayout>
  )
}

export const CampaignListPageBreadcrumb = {
  path: '/campaigns',
  label: 'Campagnes',
  parent: null
}

export const CampaignListPageRoute = {
  path: '/campaigns',
  component: CampaignListPage,
  title: 'Campagnes GNSS',
  requireAuth: true,
  permissions: ['campaigns:read']
}

export default CampaignListPage
