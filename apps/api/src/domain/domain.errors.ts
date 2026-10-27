export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INVALID_STATE_TRANSITION'
  | 'CONFLICT'
  | 'GROUP_FULL'
  | 'LEADER_ALREADY_ASSIGNED'
  | 'INVALID_ASSOCIATION'
  | 'INVOICE_NOT_DUE';

export class DomainRuleError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainRuleError';
  }
}
