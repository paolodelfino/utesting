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

  get(label: T) {
    return this._data[label];
  }

  get all() {
    return Object.values<Test<T>>(this._data);
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
      for (const test of this.all) {
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
  private _deps;

  label;
  ran = false;
  failed = false;

  constructor({
    label,
    callback,
    after,
    deps,
    set,
  }: Test_Constructor<T> & {
    set: Test_Set<T>;
  }) {
    this._set = set;

    this._callback = callback;
    this._after = after;
    this._deps = deps;

    this.label = label;
  }

  async run() {
    const loading = ora(chalk.bold(this.label));

    const old_console_log = console.log;
    console.log = (...data: any[]) => {
      loading.clear();
      loading.frame();
      old_console_log(...data);
    };

    loading.start();

    if (this._deps) {
      for (const label of this._deps) {
        const dep = this._set.get(label as T);

        if (!dep.ran) {
          this._mark(true);

          loading.stop();
          throw new Error(
            `cannot run "${this.label}" before its dependency "${dep.label}"`
          );
        }

        if (dep.failed) {
          this._mark(true);

          loading.stop();
          old_console_log(
            `${chalk.bgHex("#FFA500").bold(`  ${this.label}  `)} ${chalk.dim(
              "Skipped because a dependency has failed"
            )}`
          );
          return;
        }
      }
    }

    const sw_start = process.hrtime.bigint();

    await this._callback()
      .then(() => {
        this._mark(false);
      })
      .catch((err) => {
        this._mark(true);
        console.log(err);
      });

    const elapsed_ms = Number(process.hrtime.bigint() - sw_start) / 1e6;

    if (!this.failed) {
      await this._after?.()
        .then(() => {
          this._mark(false);
        })
        .catch((err) => {
          this._mark(true);
          console.log(err);
        });
    }

    loading.stop();
    console.log = old_console_log;

    if (this.failed) {
      console.log(
        `${chalk.bgHex("#FF0000").bold(`  ${this.label}  `)} ${chalk.dim(
          `Task has failed`
        )}`
      );
    } else {
      console.log(
        `${chalk.bgHex("#008000").bold(`  ${this.label}  `)} ${chalk.dim(
          elapsed_ms >= 1000
            ? `${(elapsed_ms / 1000).toFixed(2)}s`
            : `${elapsed_ms}ms`
        )}`
      );
    }
  }

  private _mark(failed: boolean) {
    this.failed = failed;
    this.ran = true;
  }
}
