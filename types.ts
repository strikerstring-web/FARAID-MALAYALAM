
export enum ConnectionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface EstateInfo {
  totalAssets: number;
  funeralExpenses: number;
  debts: number;
  willAmount: number;
}

export type HeirType = 
  | 'Husband'
  | 'Wife'
  | 'Father' 
  | 'Mother' 
  | 'Son' 
  | 'Daughter' 
  | 'Grandson' 
  | 'Granddaughter' 
  | 'PaternalGrandfather' 
  | 'MaternalGrandmother'
  | 'PaternalGrandmother'
  | 'FullBrother'
  | 'FullSister'
  | 'ConsanguineBrother'
  | 'ConsanguineSister'
  | 'UterineBrother'
  | 'UterineSister'
  | 'Nephew'
  | 'PaternalUncle';

export interface Heir {
  id: string;
  type: HeirType;
  count: number;
}

export enum AppStep {
  ESTATE = 'ESTATE',
  DECEASED_INFO = 'DECEASED_INFO',
  HEIRS = 'HEIRS',
  SUMMARY = 'SUMMARY'
}

export type ViewMode = 'calculator' | 'knowledge';

export enum KnowledgePage {
  WELCOME = 'WELCOME',
  DESCRIPTION = 'DESCRIPTION',
  WHY_FARAID = 'WHY_FARAID'
}
