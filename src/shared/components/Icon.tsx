import React from 'react'
import {
  DashboardIcon as DashboardIconSvg,
  RoutesIcon as RoutesIconSvg,
  NotesIcon as NotesIconSvg,
  RoutesByNotesIcon as RoutesByNotesIconSvg,
  AssignNotesIcon as AssignNotesIconSvg,
  PersonIcon as PersonIconSvg,
  SettingsIcon as SettingsIconSvg,
  BellogLogo as BellogLogoSvg,
  BellogLogoMini as BellogLogoMiniSvg,
  SasiLogo as SasiLogoSvg,
} from '../icons'

interface IconProps {
  className?: string
}

export const DashboardIcon: React.FC<IconProps> = ({ className }) => (
  <DashboardIconSvg className={className} />
)

export const RoutesIcon: React.FC<IconProps> = ({ className }) => (
  <RoutesIconSvg className={className} />
)

export const NotesIcon: React.FC<IconProps> = ({ className }) => (
  <NotesIconSvg className={className} />
)

export const RoutesByNotesIcon: React.FC<IconProps> = ({ className }) => (
  <RoutesByNotesIconSvg className={className} />
)

export const AssignNotesIcon: React.FC<IconProps> = ({ className }) => (
  <AssignNotesIconSvg className={className} />
)

export const PersonIcon: React.FC<IconProps> = ({ className }) => (
  <PersonIconSvg className={className} />
)

export const SettingsIcon: React.FC<IconProps> = ({ className }) => (
  <SettingsIconSvg className={className} />
)

export const BellogLogo: React.FC<IconProps> = ({ className }) => (
  <BellogLogoSvg className={className} />
)

export const BellogLogoMini: React.FC<IconProps> = ({ className }) => (
  <BellogLogoMiniSvg className={className} />
)

export const SasiLogo: React.FC<IconProps> = ({ className }) => (
  <SasiLogoSvg className={className} />
)
