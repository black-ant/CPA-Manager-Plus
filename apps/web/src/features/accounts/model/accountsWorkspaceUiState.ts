import {
  ACCOUNT_STATUS_FILTERS,
  type AccountQuotaBand,
  type AccountRowSort,
  type AccountStatusFilter,
} from './accountRows';
import { ACCOUNT_SORT_DEFAULT_DIRECTIONS } from './accountsPagePresentation';
import type { QuotaAccountDisplayMode } from '@/components/quota/quotaDisplay';

export type AccountOperationalFilter = 'all' | 'reauth' | 'cooldown' | 'automation' | 'recovered';
export type AccountsLayoutMode = 'table' | 'grid';
export type AccountsCardDensity = 'full' | 'compact';

export interface AccountsWorkspaceUiState {
  search: string;
  providerFilter: string;
  statusFilter: AccountStatusFilter;
  planFilter: string;
  quotaBandFilter: AccountQuotaBand;
  operationalFilter: AccountOperationalFilter;
  accountSort: AccountRowSort;
  pageSize: number;
  accountDisplayMode: QuotaAccountDisplayMode;
  layoutMode: AccountsLayoutMode;
  cardDensity: AccountsCardDensity;
}

const STORAGE_KEY = 'cpa_manager_accounts_workspace_ui_v1';
const LEGACY_AUTH_FILES_STORAGE_KEY = 'authFilesPage.uiState';
const PAGE_SIZES = new Set([10, 20, 50]);
const SORT_KEYS = new Set([
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
const SORT_DIRECTIONS = new Set(['asc', 'desc']);
const STATUS_FILTERS = new Set<AccountStatusFilter>(ACCOUNT_STATUS_FILTERS);
const QUOTA_BANDS = new Set(['all', 'ge50', 'between20and50', 'lt20', 'spent']);
const OPERATIONAL_FILTERS = new Set(['all', 'reauth', 'cooldown', 'automation', 'recovered']);

export const DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE: AccountsWorkspaceUiState = {
  search: '',
  providerFilter: 'all',
  statusFilter: 'all',
  planFilter: 'all',
  quotaBandFilter: 'all',
  operationalFilter: 'all',
  accountSort: { key: 'default', direction: 'asc' },
  pageSize: 10,
  accountDisplayMode: 'full',
  layoutMode: 'table',
  cardDensity: 'full',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getDefaultSortDirection = (key: AccountRowSort['key']) =>
  key === 'default' ? DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE.accountSort.direction : ACCOUNT_SORT_DEFAULT_DIRECTIONS[key];

export const normalizeLegacyAuthFilesSortMode = (value: unknown): AccountRowSort | null => {
  if (typeof value !== 'string') return null;
  if (value === 'default') return { key: 'default', direction: 'asc' };
  if (value === 'az' || value === 'name-asc') return { key: 'name', direction: 'asc' };
  if (value === 'note-asc' || value === 'note-desc') {
    return { key: 'note', direction: value.endsWith('desc') ? 'desc' : 'asc' };
  }
  if (value === 'priority' || value === 'priority-asc' || value === 'priority-desc') {
    return { key: 'priority', direction: value.endsWith('asc') ? 'asc' : 'desc' };
  }
  if (value === 'plan-asc' || value === 'plan-desc') {
    return { key: 'plan', direction: value.endsWith('desc') ? 'desc' : 'asc' };
  }
  return null;
};

export const normalizeAccountsWorkspaceUiState = (value: unknown): AccountsWorkspaceUiState => {
  if (!isRecord(value)) return DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE;
  const sort = isRecord(value.accountSort) ? value.accountSort : {};
  const sortKey = SORT_KEYS.has(String(sort.key))
    ? (String(sort.key) as AccountRowSort['key'])
    : DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE.accountSort.key;
  const sortDirection = SORT_DIRECTIONS.has(String(sort.direction))
    ? (String(sort.direction) as AccountRowSort['direction'])
    : getDefaultSortDirection(sortKey);
  const pageSize = Number(value.pageSize);

  return {
    search: typeof value.search === 'string' ? value.search : '',
    providerFilter:
      typeof value.providerFilter === 'string' && value.providerFilter.trim()
        ? value.providerFilter
        : 'all',
    statusFilter: STATUS_FILTERS.has(String(value.statusFilter) as AccountStatusFilter)
      ? (String(value.statusFilter) as AccountStatusFilter)
      : 'all',
    planFilter:
      typeof value.planFilter === 'string' && value.planFilter.trim() ? value.planFilter : 'all',
    quotaBandFilter: QUOTA_BANDS.has(String(value.quotaBandFilter))
      ? (String(value.quotaBandFilter) as AccountQuotaBand)
      : 'all',
    operationalFilter: OPERATIONAL_FILTERS.has(String(value.operationalFilter))
      ? (String(value.operationalFilter) as AccountOperationalFilter)
      : 'all',
    accountSort: { key: sortKey, direction: sortDirection },
    pageSize: PAGE_SIZES.has(pageSize) ? pageSize : 10,
    accountDisplayMode: value.accountDisplayMode === 'masked' ? 'masked' : 'full',
    layoutMode:
      value.layoutMode === 'grid'
        ? 'grid'
        : value.layoutMode === 'table'
          ? 'table'
          : DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE.layoutMode,
    cardDensity: value.cardDensity === 'compact' ? 'compact' : 'full',
  };
};

export const readAccountsWorkspaceUiState = (): AccountsWorkspaceUiState => {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE;
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (raw) return normalizeAccountsWorkspaceUiState(JSON.parse(raw) as unknown);

    const legacyRaw =
      window.localStorage?.getItem(LEGACY_AUTH_FILES_STORAGE_KEY) ??
      window.sessionStorage?.getItem(LEGACY_AUTH_FILES_STORAGE_KEY);
    if (!legacyRaw) return DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE;

    const legacyState = JSON.parse(legacyRaw) as unknown;
    if (!isRecord(legacyState)) return DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE;
    const legacySort = normalizeLegacyAuthFilesSortMode(legacyState.sortMode);
    return normalizeAccountsWorkspaceUiState({
      ...DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE,
      ...(legacySort ? { accountSort: legacySort } : {}),
      layoutMode:
        legacyState.viewMode === 'list'
          ? 'table'
          : legacyState.viewMode === 'diagram'
            ? 'grid'
            : DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE.layoutMode,
    });
  } catch {
    return DEFAULT_ACCOUNTS_WORKSPACE_UI_STATE;
  }
};

export const writeAccountsWorkspaceUiState = (state: AccountsWorkspaceUiState): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UI preferences are best-effort only.
  }
};
