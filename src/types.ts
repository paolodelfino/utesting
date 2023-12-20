export interface Options {
  dependencies: string[];
}

export interface Test {
  cb: () => Promise<void>;
  dependencies?: string[];
  after?: () => Promise<void>;
  ran: boolean;
  failed: boolean;
}
