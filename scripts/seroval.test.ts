import { expect, test } from "bun:test";
import { deserialize, serialize } from "seroval";
import { mobilePagePaths } from "./mobile-pages";

test("serializes Android page data with Arabic content and shared references", () => {
  const shared = { label: "قراءة بطاقة NFC", pages: [...mobilePagePaths] };
  const result = deserialize(serialize({ first: shared, second: shared }));
  expect(result.first.label).toBe("قراءة بطاقة NFC");
  expect(result.first.pages).toEqual([...mobilePagePaths]);
  expect(result.first).toBe(result.second);
});