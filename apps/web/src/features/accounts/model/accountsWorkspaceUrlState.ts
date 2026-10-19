import type { DetailTab, AccountsView } from './accountsPagePresentation';
import { ACCOUNT_SORT_DEFAULT_DIRECTIONS } from './accountsPagePresentation';
import {
  DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE,
  normalizeLegacyAuthFilesSortMode,
  type AccountsWorkspaceUiState,
} from './accountsWorkspaceUiState';
import { ACCOUNT_STATUS_FILTERS } from './accountRows';
import type { CredentialHealthInspectionMode } from '@/features/monitoring/model/credentialInspectionSnapshot';

export type AccountsOAuthEditor = 'excluded' | 'alias';

export interface AccountsWorkspaceUrlState extends AccountsWorkspaceUiState {
  view: AccountsView;
  healthMode: CredentialHealthInspectionMode;
  account: string | null;
  detailTab: DetailTab;
  editor: AccountsOAuthEditor | null;
  editorProvider: string;
}

const VIEW_SET = new Set<AccountsView>(['accounts', 'health', 'oauth']);
const HEALTH_MODE_SET = new Set<CredentialHealthInspectionMode>(['local', 'server']);
const DETAIL_TAB_SET = new Set<DetailTab>(['overview', 'quota', 'config', 'models', 'diagnostics']);
const STATUS_FILTER_SET: ReadonlySet<AccountsWorkspaceUiState['statusFilter']> = new Set(
  ACCOUNT_STATUS_FILTERS
);
const QUOTA_BAND_SET: ReadonlySet<AccountsWorkspaceUiState['quotaBandFilter']> = new Set([
  'all',
  'ge50',
  'between20and50',
  'lt20',
  'spent',
]);
const OPERATIONAL_FILTER_SET: ReadonlySet<AccountsWorkspaceUiState['operationalFilter']> = new Set([
  'all',
  'reauth',
  'cooldown',
  'automation',
  'recovered',
]);
const SORT_KEY_SET: ReadonlySet<AccountsWorkspaceUiState['accountSort']['key']> = new Set([
  'default',
  'name',
  'plan',
  'note',
  'reset',
  'remaining',
  'priority',
  'recent',
  'quota',
  'created',
]);
const PAGE_SIZE_SET = new Set([10, 20, 50]);
const MANAGED_QUERY_KEYS = [
  'view',
  'healthMode',
  'search',
  'provider',
  'status',
  'plan',
  'quota',
  'operation',
  'sort',
  'direction',
  'pageSize',
  'display',
  'layout',
  'density',
  'account',
  'tab',
  'editor',
  'editorProvider',
] as const;

const readEnum = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: ReadonlySet<T>,
  fallback: T
): T => {
  const value = params.get(key);
  return value && allowed.has(value as T) ? (value as T) : fallback;
};

const readNonEmpty = (params: URLSearchParams, key: string, fallback: string): string => {
  const value = params.get(key);
  return value === null ? fallback : value.trim() || fallback;
};

const readAccountSort = (
  params: URLSearchParams,
  fallback: AccountsWorkspaceUiState['accountSort']
): AccountsWorkspaceUiState['accountSort'] => {
  const requestedSort = params.get('sort');
  const legacySort = normalizeLegacyAuthFilesSortMode(requestedSort);
  const currentSortKey = Boolean(
    requestedSort &&
      SORT_KEY_SET.has(requestedSort as AccountsWorkspaceUiState['accountSort']['key'])
  );
  const key = legacySort?.key ?? readEnum(params, 'sort', SORT_KEY_SET, fallback.key);
  const defaultDirection = legacySort
    ? legacySort.direction
    : currentSortKey
      ? key === 'default'
        ? DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE.accountSort.direction
        : ACCOUNT_SORT_DEFAULT_DIRECTIONS[key]
      : fallback.direction;

  return {
    key,
    direction: readEnum(
      params,
      'direction',
      new Set<AccountsWorkspaceUiState['accountSort']['direction']>(['asc', 'desc']),
      defaultDirection
    ),
  };
};

export const readAccountsWorkspaceUrlState = (
  search: string,
  fallback: AccountsWorkspaceUiState
): AccountsWorkspaceUrlState => {
  const params = new URLSearchParams(search);
  const requestedView = params.get('view');
  const view =
    requestedView === 'inspection' ? 'health' : readEnum(params, 'view', VIEW_SET, 'accounts');
  const pageSizeValue = Number(params.get('pageSize'));
  const editorValue = params.get('editor');
  const editor = editorValue === 'excluded' || editorValue === 'alias' ? editorValue : null;

  return {
    ...fallback,
    view,
    healthMode: readEnum(params, 'healthMode', HEALTH_MODE_SET, 'local'),
    search: params.get('search') ?? fallback.search,
    providerFilter: readNonEmpty(params, 'provider', fallback.providerFilter),
    statusFilter: readEnum(params, 'status', STATUS_FILTER_SET, fallback.statusFilter),
    planFilter: readNonEmpty(params, 'plan', fallback.planFilter),
    quotaBandFilter: readEnum(params, 'quota', QUOTA_BAND_SET, fallback.quotaBandFilter),
    operationalFilter: readEnum(
      params,
      'operation',
      OPERATIONAL_FILTER_SET,
      fallback.operationalFilter
    ),
    accountSort: readAccountSort(params, fallback.accountSort),
    pageSize: PAGE_SIZE_SET.has(pageSizeValue) ? pageSizeValue : fallback.pageSize,
    accountDisplayMode:
      params.get('display') === 'masked'
        ? 'masked'
        : params.get('display') === 'full'
          ? 'full'
          : fallback.accountDisplayMode,
    layoutMode:
      params.get('layout') === 'grid'
        ? 'grid'
        : params.get('layout') === 'table'
          ? 'table'
          : fallback.layoutMode,
    cardDensity:
      params.get('density') === 'compact'
        ? 'compact'
        : params.get('density') === 'full'
          ? 'full'
          : fallback.cardDensity,
    account: params.get('account') || null,
    detailTab:
      params.get('tab') === 'credential'
        ? 'config'
        : readEnum(params, 'tab', DETAIL_TAB_SET, 'overview'),
    editor,
    editorProvider: params.get('editorProvider')?.trim() ?? '',
  };
};

const setNonDefault = (
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string
) => {
  if (value && value !== defaultValue) params.set(key, value);
};

export const writeAccountsWorkspaceUrlSearch = (
  currentSearch: string,
  state: AccountsWorkspaceUrlState,
  defaults: AccountsWorkspaceUiState
): string => {
  const params = new URLSearchParams(currentSearch);
  MANAGED_QUERY_KEYS.forEach((key) => params.delete(key));

  setNonDefault(params, 'view', state.view, 'accounts');
  if (state.view === 'health') params.set('healthMode', state.healthMode);
  setNonDefault(params, 'search', state.search, '');
  setNonDefault(params, 'provider', state.providerFilter, defaults.providerFilter);
  setNonDefault(params, 'status', state.statusFilter, defaults.statusFilter);
  setNonDefault(params, 'plan', state.planFilter, defaults.planFilter);
  setNonDefault(params, 'quota', state.quotaBandFilter, defaults.quotaBandFilter);
  setNonDefault(params, 'operation', state.operationalFilter, defaults.operationalFilter);
  if (state.accountSort.key !== defaults.accountSort.key) {
    params.set('sort', state.accountSort.key);
    params.set('direction', state.accountSort.direction);
  } else {
    setNonDefault(params, 'direction', state.accountSort.direction, defaults.accountSort.direction);
  }
  if (state.pageSize !== defaults.pageSize) params.set('pageSize', String(state.pageSize));
  setNonDefault(params, 'display', state.accountDisplayMode, defaults.accountDisplayMode);
  setNonDefault(params, 'layout', state.layoutMode, defaults.layoutMode);
  setNonDefault(params, 'density', state.cardDensity, defaults.cardDensity);
  if (state.account) {
    params.set('account', state.account);
    setNonDefault(params, 'tab', state.detailTab, 'overview');
  }
  if (state.view === 'oauth' && state.editor) {
    params.set('editor', state.editor);
    setNonDefault(params, 'editorProvider', state.editorProvider, '');
  }

  const value = params.toString();
  return value ? `?${value}` : '';
};
