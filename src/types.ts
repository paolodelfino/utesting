export interface Options {
  dependencies: string[];
  after: () => Promise<void>;
}

export type Test = Partial<Options> & {
  cb: () => Promise<void>;
  ran: boolean;
  failed: boolean;
};
