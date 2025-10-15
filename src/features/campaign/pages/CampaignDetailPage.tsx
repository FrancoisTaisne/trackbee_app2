/**
 * Campaign Detail Page - nouvelle mise en page unifiée
 */

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import {
  AppLayout,
  PageHeader,
  Section,
  Button,
  Breadcrumb
} from '@/shared/ui/components'
import { LoadingSpinner } from '@/shared/ui/components/Feedback/LoadingSpinner'
import { ErrorMessage } from '@/shared/ui/components/Feedback/ErrorMessage'
import { CampaignDetail } from '../components'
import { useCampaign } from '../hooks'
import type { Campaign } from '../types'

const buildBreadcrumb = (label: string) => (
  <Breadcrumb
    items={[
      { label: 'Campagnes', href: '/campaigns' },
      { label, current: true }
    ]}
  />
)

export function CampaignDetailPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()

  const parsedCampaignId = campaignId ? Number.parseInt(campaignId, 10) : Number.NaN

  const {
    campaign,
    isLoading: isLoadingCampaign,
    error: campaignError
  } = useCampaign(Number.isNaN(parsedCampaignId) ? 0 : parsedCampaignId)

  const handleNavigateBack = () => {
    navigate('/campaigns')
  }

  const handleNavigateToSite = () => {
    if (campaign?.siteId) {
      navigate(`/sites/${campaign.siteId}`)
    }
  }

  const handleNavigateToDevice = () => {
    if (campaign?.machineId) {
      navigate(`/devices/${campaign.machineId}`)
    }
  }

  const handleCampaignUpdate = (_updatedCampaign: Campaign) => {
    // Le cache TanStack Query broadcast déjà les changements
  }

  const handleCampaignDelete = (_deletedCampaignId: number) => {
    navigate('/campaigns', { replace: true })
  }

  if (!campaignId || Number.isNaN(parsedCampaignId)) {
    return (
      <AppLayout title="Campagne introuvable">
        <PageHeader
          title="Campagne introuvable"
          description="L'identifiant fourni ne correspond à aucune campagne."
          breadcrumb={buildBreadcrumb('Erreur')}
          actions={(
            <Button variant="outline" onClick={handleNavigateBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux campagnes
            </Button>
          )}
        />

        <Section>
          <ErrorMessage message="Impossible de déterminer la campagne demandée." />
        </Section>
      </AppLayout>
    )
  }

  if (isLoadingCampaign) {
    return (
      <AppLayout title="Chargement de la campagne">
        <PageHeader
          title="Chargement de la campagne"
          breadcrumb={buildBreadcrumb('Chargement')}
        />
        <Section>
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </Section>
      </AppLayout>
    )
  }

  if (campaignError) {
    return (
      <AppLayout title="Erreur lors du chargement">
        <PageHeader
          title="Erreur lors du chargement"
          breadcrumb={buildBreadcrumb('Erreur')}
          actions={(
            <Button variant="outline" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          )}
        />
        <Section>
          <ErrorMessage message={campaignError} />
        </Section>
      </AppLayout>
    )
  }

  const campaignTitle = campaign?.name || (campaign ? `Campagne #${campaign.id}` : 'Campagne')

  return (
    <AppLayout title={campaignTitle}>
      <PageHeader
        title={campaignTitle}
        description={campaign?.description}
        breadcrumb={buildBreadcrumb(campaignTitle)}
        actions={(
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleNavigateBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            {campaign?.siteId && (
              <Button variant="outline" onClick={handleNavigateToSite}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le site
              </Button>
            )}
            {campaign?.machineId && (
              <Button variant="outline" onClick={handleNavigateToDevice}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le device
              </Button>
            )}
          </div>
        )}
      />

      <Section>
        <CampaignDetail
          campaignId={parsedCampaignId}
          onUpdate={handleCampaignUpdate}
          onDelete={handleCampaignDelete}
        />
      </Section>
    </AppLayout>
  )
}

export const CampaignDetailPageBreadcrumb = {
  path: '/campaigns/:campaignId',
  label: (params: { campaignId: string }) => `Campagne #${params.campaignId}`,
  parent: '/campaigns',
  dynamic: true
}

export const CampaignDetailPageRoute = {
  path: '/campaigns/:campaignId',
  component: CampaignDetailPage,
  title: 'Détail campagne',
  requireAuth: true,
  permissions: ['campaigns:read']
}

export default CampaignDetailPage
