import chalk from "chalk";
import ora from "ora";
import { Test_Constructor } from "./types";

export class Test_Set<T extends string> {
  // @ts-ignore
  private _data!: Record<T, Test<T>> = {};

  constructor(tests: Record<T, Omit<Test_Constructor<T>, "label">>) {
    for (const label in tests) {
      this._data[label] = new Test({
        ...tests[label],
        label,
        set: this,
      });
    }
  }

  get values() {
    return Object.values<Test<T>>(this._data);
  }

  get keys(): T[] {
    return Object.keys(this._data) as T[];
  }

  get(label: T) {
    return this._data[label];
  }

  has(label: string): label is T {
    // @ts-ignore
    return !!this._data[label];
  }

  async run(): Promise<void>;
  async run(label: T): Promise<void>;
  async run(
    label: string,
    test: Omit<Test_Constructor<T>, "label">
  ): Promise<void>;
  async run(
    label?: T | string,
    test?: Omit<Test_Constructor<T>, "label">
  ): Promise<void> {
    if (!label && !test) {
      for (const test of this.values) {
        await test.run();
      }
      return;
    }

    if (test) {
      await new Test({
        ...test,
        label: label!,
        set: this,
      }).run();
      return;
    }

    await this.get(label as T).run();
  }
}

class Test<T extends string> {
  private _set;

  private _callback;
  private _after;
  private _before;
  private _deps;

  label;
  ran = false;
  failed = false;

  constructor({
    set,
    callback,
    after,
    before,
    deps,
    label,
  }: Test_Constructor<T> & {
    set: Test_Set<T>;
  }) {
    this._set = set;

    this._callback = callback;
    this._after = after;
    this._before = before;
    this._deps = deps;

    this.label = label;
  }

  async run() {
    const spinner = ora(chalk.bold(this.label));

    const old_console_log = console.log;
    console.log = (...data: any[]) => {
      spinner.clear();
      spinner.frame();
      old_console_log(...data);
    };

    spinner.start();

    if (this._deps) {
      for (const label of this._deps) {
        const dep = this._set.get(label as T);

        if (!dep.ran) {
          const hierarchy: string[] = [dep.label];
          (function recursive_detect(test: Test<T>) {
            if (!test._deps) return;

            for (const label of test._deps) {
              if (!test._set.get(label).ran) {
                hierarchy.push(label);
              }
            }
          })(dep);

          spinner.stop();

          throw new Error(
            `cannot run "${this.label}" before its dependency "${dep.label}" (error hierarchy found: ${hierarchy})`
          );
        }

        if (dep.failed) {
          this._mark(true);

          spinner.stop();
          old_console_log(
            `${chalk.bgHex("#FFA500").bold(`  ${this.label}  `)} ${chalk.dim(
              `Skipped because a dependency has failed: ${dep.label}`
            )}`
          );
          return;
        }
      }
    }

    async function run_and_result(
      test: Test<T>,
      callback?: Test_Constructor<T>["callback"]
    ) {
      await callback?.()
        .then(() => {
          test._mark(false);
        })
        .catch((err) => {
          test._mark(true);
          console.log(err);
        });
      return !test.failed;
    }

    let elapsed_ms = 0;
    const succeed =
      (await run_and_result(this, this._before)) &&
      (await run_and_result(this, async () => {
        const sw_start = process.hrtime.bigint();
        await this._callback();
        elapsed_ms = Number(process.hrtime.bigint() - sw_start) / 1e6;
      })) &&
      (await run_and_result(this, this._after));

    spinner.stop();
    console.log = old_console_log;

    if (succeed) {
      console.log(
        `${chalk.bgHex("#008000").bold(`  ${this.label}  `)} ${chalk.dim(
          elapsed_ms >= 1000
            ? `${(elapsed_ms / 1000).toFixed(2)}s`
            : `${elapsed_ms}ms`
        )}`
      );
    } else {
      console.log(
        `${chalk.bgHex("#FF0000").bold(`  ${this.label}  `)} ${chalk.dim(
          `Task has failed`
        )}`
      );
    }
  }

  private _mark(failed: boolean) {
    this.failed = failed;
    this.ran = true;
  }
}
