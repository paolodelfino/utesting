export interface Test_Constructor<T extends string> {
  label: string;
  callback: () => Promise<void>;
  after?: () => Promise<void>;
  deps?: T[];
}
