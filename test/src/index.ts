import { assert } from "chai";
import { Test_Set } from "../../dist/index.mjs";

async function main() {
  {
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

    for (const test of tests.values) {
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

    for (const test of tests.values) {
      assert.isTrue(test.ran);
      assert.isFalse(test.failed);
    }

    assert.strictEqual(tests.keys[0], "foo");
    assert.strictEqual(tests.keys[1], "foo2");
  }

  {
    const tests = new Test_Set<"test1" | "test2">({
      test1: {
        async callback() {
          throw new Error("Error: Hello from test1");
        },
        async after() {
          assert(0, "Should not run");
        },
      },
      test2: {
        async callback() {
          assert(0, "Should not run");
        },
        deps: ["test1"],
      },
    });

    await tests.run();
  }

  {
    const tests = new Test_Set<"test1" | "test2">({
      test1: {
        async callback() {
          throw new Error("Error: Hello from test1");
        },
        async after() {
          assert(0, "Should not run");
        },
      },
      test2: {
        async callback() {
          assert(0, "Should not run");
        },
        deps: ["test1"],
      },
    });

    await tests
      .run("test2")
      .then(() => {
        assert(0 && "Should not succeed");
      })
      .catch((err) => {
        console.log(err);
      });

    for (const test of tests.values) {
      assert.isFalse(test.ran, test.label);
      assert.isFalse(test.failed, test.label);
    }
  }

  {
    const tests = new Test_Set<"test1" | "test2" | "test3">({
      test1: {
        async callback() {
          assert(0, "Should not run");
        },
        async after() {
          assert(0, "Should not run");
        },
      },
      test2: {
        async callback() {
          assert(0, "Should not run");
        },
        deps: ["test1"],
      },
      test3: {
        async callback() {
          assert(0, "Should not run");
        },
        deps: ["test2"],
      },
    });

    await tests
      .run("test3")
      .then(() => {
        assert(0 && "Should not succeed");
      })
      .catch((err) => {
        console.log(err);

        assert.include(err.message, "test2");
        assert.include(err.message, "test1");

        const test2 = err.message.indexOf("test2");
        const test1 = err.message.indexOf("test1");

        assert.isAbove(test1, test2, "test1 should appear after test2");
      });
  }
}

main();
