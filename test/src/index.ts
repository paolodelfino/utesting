import { Test_Set } from "../../dist/index.mjs";

async function main() {
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

  await tests.run();
  await tests.run("foo2");
  await tests.run("hello", {
    async callback() {
      console.log("Hello from hello");
    },
    deps: ["foo2"],
  });
}

main();
