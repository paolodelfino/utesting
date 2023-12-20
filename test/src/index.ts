import { assert } from "chai";
import { UTesting } from "../../dist/index.mjs";
import { time } from "./utils";

async function main() {
  const tests = new UTesting();

  tests.add("Test1", async () => {
    await time(230);

    console.log("Test1 task");
    throw new Error("Test1 error");
  });

  tests.add(
    "Test2",
    async () => {
      await time(700);
      console.log("Test2 task");
    },
    {
      dependencies: ["Test1"],
    }
  );

  try {
    tests.add(
      "Test4",
      async () => {
        await time(1287);
        console.log("Test4 task");
      },
      {
        dependencies: ["Test3"],
      }
    );
    throw new Error(
      'Should throw an error because "Test4" runs before "Test3"'
    );
  } catch {}

  tests.add(
    "Test3",
    async () => {
      await time(1287);
      console.log("Test3 task");
    },
    {
      async after() {
        console.log("Test3 after log");
        await time(1500);

        tests.add("Test3 After Task", async () => {
          console.log("Test3 after task log");
          await time(3500);
        });
        await tests.run("Test3 After Task");
      },
    }
  );

  await tests.run("Test2").catch(() => {});
  assert.isTrue(
    tests.get("Test2").failed,
    'Should throw an error because "Test2" is ran before its dependency "Test1"'
  );

  await tests.run();
  await tests.run("Test2");
  await tests.run("Test3");
}

main();
