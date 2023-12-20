import chalk from "chalk";
import ora from "ora";
import { Options, Test } from "./types";

export class UTesting {
  private _tests: Record<string, Test> = {};

  add(label: string, cb: Test["cb"], options?: Partial<Options>) {
    if (options?.dependencies) {
      for (const dep of options.dependencies) {
        if (!this._tests[dep]) {
          throw new Error(
            `"${label}" cannot depend on "${dep}" because "${label}" runs before "${dep}"`
          );
        }
      }
    }

    this._tests[label] = {
      cb,
      dependencies: options?.dependencies,
      ran: false,
      failed: false,
    };
  }

  get(label: string) {
    return this._tests[label];
  }

  private async _run(label: string) {
    const loading = ora(chalk.bold(label));
    const old_console_log = console.log;
    console.log = (...data: any[]) => {
      loading.clear();
      loading.frame();
      old_console_log(...data);
    };
    loading.start();

    const test = this._tests[label];

    if (test.dependencies) {
      for (const dep of test.dependencies) {
        if (this._tests[dep].failed) {
          test.failed = true;
          test.ran = true;
          loading.stop();
          old_console_log(
            `${chalk.bgHex("#FFA500").bold(`  ${label}  `)} ${chalk.dim(
              "Skipped because a dependency has failed"
            )}`
          );
          return;
        }

        if (!this._tests[dep].ran) {
          test.failed = true;
          test.ran = true;
          loading.stop();
          throw new Error(
            `cannot run "${label}" before its dependency "${dep}"`
          );
        }
      }
    }

    const sw_start = process.hrtime.bigint();
    await test.cb().catch((err) => {
      test.failed = true;
      console.log(err);
    });
    const elapsed = Number(process.hrtime.bigint() - sw_start) / 1e6;
    test.ran = true;

    loading.stop();
    console.log = old_console_log;

    if (test.failed) {
      console.log(
        `${chalk.bgHex("#FF0000").bold(`  ${label}  `)} ${chalk.dim(
          `Task has failed`
        )}`
      );
    } else {
      console.log(
        `${chalk.bgHex("#008000").bold(`  ${label}  `)} ${chalk.dim(
          `${elapsed}ms`
        )}`
      );
    }
  }

  run(): Promise<void>;
  run(label: string): Promise<void>;
  async run(label?: string): Promise<void> {
    if (label) {
      await this._run(label);
      return;
    }

    for (const key of Object.keys(this._tests)) {
      await this._run(key);
    }
  }
}
