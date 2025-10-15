/**
 * Shared UI Components Export Index
 * Point d'entrée centralisé pour tous les composants UI partagés
 */

import type { ReactNode } from 'react'

// ==================== COMPONENTS FONDAMENTAUX ====================

// Button Components
export * from './Button'

// Input Components
// export * from './Input'

// Card Components
export * from './Card'

// Badge Components
export * from './Badge'

// Modal Components
export * from './Modal'

// Progress Components
export * from './Progress'

// Layout Components
export * from './Layout'

// ==================== RE-EXPORTS DIRECTS ====================

// Button
export { Button, ButtonGroup } from './Button/Button'
export type { ButtonProps, ButtonGroupProps } from './Button/Button'

// Input
export { Input, SearchInput, PasswordInput } from './Input/Input'
export type { InputProps } from './Input/Input'

// Card - exports complets
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatusCard, MetricCard } from './Card/Card'
export type { CardProps, CardHeaderProps, CardTitleProps, CardDescriptionProps, CardContentProps, CardFooterProps } from './Card/Card'

// Badge - exports basiques seulement
export { Badge } from './Badge/Badge'
export type { BadgeProps } from './Badge/Badge'

// Modal - exports complets
export {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ConfirmationModal,
  FormModal,
  LoadingModal
} from './Modal/Modal'
export type {
  ModalProps,
  ModalHeaderProps,
  ModalContentProps,
  ModalFooterProps
} from './Modal/Modal'

// Progress - exports basiques
export { Progress } from './Progress/Progress'
export type { ProgressProps } from './Progress/Progress'

// Tabs - exports complets
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs'

// Layout
export {
  AppLayout,
  ContentWrapper,
  PageHeader,
  Section,
  Header,
  Breadcrumb,
  StatusBar,
  Sidebar,
  UserMenu,
  MobileNav,
  FloatingActionButton,
  TabBar
} from './Layout'
export type {
  AppLayoutProps,
  ContentWrapperProps,
  PageHeaderProps,
  SectionProps,
  HeaderProps,
  BreadcrumbProps,
  BreadcrumbItem,
  StatusBarProps,
  SidebarProps,
  SidebarItem,
  UserMenuProps,
  MobileNavProps,
  MobileNavItem,
  FloatingActionButtonProps,
  TabBarProps,
  TabBarItem
} from './Layout'

// ==================== VARIANT EXPORTS ====================

export { buttonVariants } from './Button/Button'
export { inputVariants } from './Input/Input'
export { cardVariants } from './Card/Card'
export { badgeVariants } from './Badge/Badge'

// ==================== UTILITY TYPES ====================

/**
 * Union type de toutes les variantes de couleur disponibles
 */
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Union type de toutes les tailles disponibles
 */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Props de base pour tous les composants UI
 */
export interface BaseUIProps {
  className?: string
  children?: ReactNode
}

/**
 * Props pour les composants avec variantes de couleur
 */
export interface ColorVariantProps {
  variant?: ColorVariant
}

/**
 * Props pour les composants avec variantes de taille
 */
export interface SizeVariantProps {
  size?: SizeVariant
}

/**
 * Props pour les composants avec état de chargement
 */
export interface LoadingProps {
  loading?: boolean
  loadingText?: string
}

/**
 * Props pour les composants avec état disabled
 */
export interface DisabledProps {
  disabled?: boolean
}

/**
 * Props combinées pour les composants interactifs
 */
export interface InteractiveProps extends BaseUIProps, ColorVariantProps, SizeVariantProps, LoadingProps, DisabledProps {}

// ==================== TEMPORARY EXPORTS ====================

// Composants temporaires pour débloquer les erreurs
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch
} from './temp-exports'

export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectContentProps,
  SelectItemProps,
  SwitchProps
} from './temp-exports'

// ==================== EXAMPLES ET DOCUMENTATION ====================

/**
 * Guide d'utilisation des composants UI:
 *
 * 1. **Importation groupée** :
 * ```typescript
 * import { Button, Card, Input, Modal } from '@/shared/ui/components'
 * ```
 *
 * 2. **Importation spécifique** :
 * ```typescript
 * import { Button } from '@/shared/ui/components/Button'
 * import { StatusCard } from '@/shared/ui/components/Card'
 * ```
 *
 * 3. **Utilisation des types** :
 * ```typescript
 * import type { ButtonProps, CardProps } from '@/shared/ui/components'
 * ```
 *
 * 4. **Composition recommandée** :
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Titre</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <Input label="Nom" />
 *     <StatusBadge status="online" />
 *   </CardContent>
 *   <CardFooter>
 *     <ButtonGroup>
 *       <Button variant="outline">Annuler</Button>
 *       <Button>Confirmer</Button>
 *     </ButtonGroup>
 *   </CardFooter>
 * </Card>
 * ```
 *
 * 5. **Layout recommandé** :
 * ```tsx
 * <AppLayout title="Dashboard">
 *   <PageHeader
 *     title="Mes Devices"
 *     actions={<Button>Nouveau</Button>}
 *   />
 *   <Section title="Devices connectés">
 *     <Card>Contenu...</Card>
 *   </Section>
 * </AppLayout>
 * ```
 */
