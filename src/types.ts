export interface Options {
  dependencies: string[];
}

export interface Test {
  cb: () => Promise<void>;
  dependencies?: string[];
  ran: boolean;
  failed: boolean;
}
