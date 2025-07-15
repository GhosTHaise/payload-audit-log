import { describe, it, expect } from "vitest";
import {auditLogPlugin} from "./index";

describe("auditLogPlugin", () => {
  it("should be a function", () => {
    expect(typeof auditLogPlugin).toBe("function");
  });

  it("should return a function when invoked", () => {
    const plugin = auditLogPlugin({});
    expect(typeof plugin).toBe("function");
  });
});
