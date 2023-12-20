export interface Test_Constructor<T extends string> {
  label: string;
  callback: () => Promise<void>;
  after?: Test_Constructor<T>["callback"];
  before?: Test_Constructor<T>["callback"];
  deps?: T[];
}
