## 📝 Note on DSL–Engine Bleed (Current State & Future Plan)

### ⚠️ Current Bleed Between DSL and Engine

Right now, the system mixes _language-level constructs_ (the DSL) and _execution-level logic_ (the engine) in a few key places:

- `MetricFrame.js` acts as **both** the DSL builder and the execution engine.
- Filters like `.filter((r) => Scalar.gt(r.revenue, 1000))` directly reference
  engine-level scalar functions instead of staying purely declarative.
- DSL builders (`Column`, `Aggregation`) live alongside lower-level
  implementations (`Scalar`, `AggImpl`, CSV IO, inference, etc.).

This isn’t “wrong” — it’s a normal stage of development while the language semantics are still evolving.

---

### 🧠 Why We’re Keeping the Bleed _For Now_

- **Flexibility:** While the DSL is still rapidly iterating, it’s easier to tweak behavior when all logic is centralized.
- **Speed:** You can ship new features and experiment without maintaining two parallel abstractions.
- **Simplicity:** One mental model while the design stabilizes, avoiding premature over-architecture.
- **Exploration:** You’re still discovering what the language _should_ feel like, and a clean boundary would only slow that down.

In short: **shipping beats purity** at this stage.

---

### 🔮 Future Refactor Plan (Separation of Concerns)

Once the DSL stabilizes, the following split is the natural evolution:

#### 1. **Engine Layer (`engine/`)**

- Pure implementations: **Scalar**, **AggImpl**, **Inference**, **Columnar**
- Query executor: “EngineFrame” / “ExecutionPlanRunner”
- Language-agnostic, portable to Python / Rust / C

#### 2. **DSL Layer (`dsl/`)**

- Declarative builders: **Column**, **Aggregation**, future **Window**, **Join**, **Reshape**
- Query planner: builds a _plan_ instead of executing immediately
- No direct access to data rows or actual functions

#### 3. **Glue Layer**

- Turns `.group().calc().agg().order().build()` into a query plan
- Feeds that plan to the engine for execution

At that point:

```js
.filter((r) => Scalar.gt(r.revenue, 1000))
```
