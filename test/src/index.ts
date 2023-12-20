import { assert } from "chai";
import { Test_Set } from "../../dist/index.mjs";
import { stopwatch } from "./utils";

async function main() {
  await stopwatch("basic", async () => {
    const tests = new Test_Set<"foo" | "foo2">({
      foo: {
        async callback() {
          console.log("Hello from foo");
        },
        async after() {
          console.log("Hello from foo's after");
        },
      },
      foo2: {
        async callback() {
          console.log("Hello from foo2");
        },
        deps: ["foo"],
      },
    });

    for (const test of tests.all) {
      assert.isFalse(test.ran);
      assert.isFalse(test.failed);
    }

    await tests.run();
    await tests.run("foo2");
    await tests.run("hello", {
      async callback() {
        console.log("Hello from hello");
      },
      deps: ["foo2"],
    });

    for (const test of tests.all) {
      assert.isTrue(test.ran);
      assert.isFalse(test.failed);
    }
  });
}

main();
