/**
 * Core Types Index
 * Centralized export of all core types
 */

// PUSH FINAL: Exports explicites pour éviter conflits de noms
export * from './domain'
export type {
  // Transport types uniques (éviter les doublons)
  BleFileInfo,
  FileMetadata,
  BleConnectionState,
  TransferTask,
  TransferProgress,
  ApiResponse,
  AuthResponse,
  HydratedUser,
  SystemEvent,
  AppError
} from './transport'
export {
  BleCommandSchema,
  ApiResponseSchema,
  SystemEventSchema,
  safeParseWithLog,
  createSystemEvent,
  createAppError
} from './transport'
export * from './errors'