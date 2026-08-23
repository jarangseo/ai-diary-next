# Vue → React

Notes from porting a decade of Vue habits onto this project. Written while building the
streaming thread, so the examples are the real ones, and the performance claims come from
[`STREAMING_PERF.md`](./STREAMING_PERF.md) rather than from folklore.

The point is not that one framework wins. It is that **they automated different things**,
and knowing which is which is the difference between fighting a framework and using it.

---

## The one difference everything else follows from

> **Vue tracks what changed and updates that.
> React re-runs the component and reconciles the result.**

Set `thread.value = x` and Vue already knows which DOM nodes read it. Call `setThread(x)`
and React runs the function again from the top, builds a new result, and diffs.

Every item below is a consequence of that sentence.

---

## Things that look different but are the same

Worth stating first, because a comparison that finds only differences is not a comparison.

### Stale responses race in both

Both frameworks re-run an effect when a parameter changes, and neither cancels the
in-flight work. A slow response for thread A can land after a fast one for B and
overwrite it.

```ts
// React
useEffect(() => {
  let ignore = false
  fetchThread(threadId).then((d) => { if (!ignore) setThread(d) })
  return () => { ignore = true }
}, [threadId])

// Vue
watch(threadId, async (id, _prev, onCleanup) => {
  let ignore = false
  onCleanup(() => { ignore = true })
  const d = await fetchThread(id)
  if (!ignore) thread.value = d
}, { immediate: true })
```

Same bug, same fix, different spelling. React's StrictMode double-invoke in development
makes it surface sooner, which is a feature.

The guard has to cover **every** write, not just the successful one — a late failure that
sets an error state on top of a newer successful load is the same bug wearing a hat.

### Route changes do not remount

Navigating `/diary/a` → `/diary/b` keeps the component instance in both. React decides
identity by position + type + `key`; Vue Router reuses the component when only params
change. That is why both need an explicit "watch the param" mechanism, and why both offer
the same escape hatch:

```tsx
<ThreadPanel key={threadId} />        {/* React */}
<router-view :key="$route.fullPath" /> <!-- Vue -->
```

`key` throws away all state — scroll position, half-typed text — so it is a blunt tool in
both.

### `fetch` resolves on 4xx/5xx

Nothing to do with either framework, but it bites everyone arriving from an axios
codebase, where non-2xx rejects. `response.ok` has to be checked by hand.

---

## Things that are genuinely different

### Hooks re-run; composables do not

A React hook is a function that runs **on every render**. A Vue composable runs **once**,
in `setup`, and leaves a reactive graph behind.

```ts
useThread(threadId)                     // React: plain string is fine
useThread(toRef(props, 'threadId'))     // Vue: must be a Ref, or it is frozen forever
```

Forget `toRef` in Vue and nothing errors — the first thread just shows forever. React has
no such trap, because the latest props arrive automatically on the next render.

React's trap is the mirror image: since the function re-runs, every value inside it is a
**snapshot of that render**. An async loop started three renders ago still sees the old
one.

> **Vue's problem is "how do I get the latest value in".
> React's problem is "when did this value go stale".**
> Two ends of the same trade-off; the mines are in different places.

### Updating state during a stream

This is where the difference stops being academic. ~50 updates per second:

```ts
// Vue
messages.value.at(-1).content += delta

// React — the functional form is mandatory, not stylistic
setMessages((prev) =>
  prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
)
```

Two React rules are visible in that one line:

1. **`prev =>` or nothing.** `[...messages, x]` reads the array captured when the stream
   started and would append to a stale copy 800 times in a row.
2. **New object, new array.** React compares by reference; mutating in place is invisible
   to it. Vue detects mutation, so the Vue version reads like ordinary JavaScript.

### `useState` vs `useRef` — a question Vue never asks

Vue has one `ref` for everything. React makes you answer *"does the screen change when
this changes?"* every time.

```ts
const [messages, setMessages] = useState([])   // rendered → state
const abortRef = useRef(null)                  // never rendered → ref
```

Putting the abort controller in state would re-render the entire thread on every send for
no visible reason.

### `useEffectEvent` is React catching up to `watch`

An effect mixes two kinds of value: ones that should make it re-run, and ones it merely
reads when it runs. A dependency array cannot express that difference, so you pick
between reconnecting on every theme change or reading a stale theme.

```tsx
const onConnected = useEffectEvent(() => showToast('connected', theme)) // always fresh
useEffect(() => { /* ... */ }, [roomId])                                // theme absent
```

This project already hand-rolled it: `useSocket.ts` keeps a `callbacksRef` refreshed every
render precisely so the socket does not reconnect when a callback identity changes.
`useEffectEvent` is that idiom promoted to an API.

Vue never had the problem. `watch(roomId, ...)` names its dependency explicitly and reads
`theme.value` freshly inside — the two kinds of value were never conflated.

> **`useEffectEvent` is React expressing what `watch` could always do.**

Not used for the thread's auto-scroll, though: there `pinned` *should* be reactive, so
scrolling back down resumes following on the same token instead of the next one. Knowing
when not to reach for it is the actual skill.

---

## Performance: opposite mechanisms, similar outcome

The expectation going in was that React's re-render model would make streaming expensive
and Vue's would not. Measured, it was not that simple.

| | Vue | React |
| --- | --- | --- |
| Mechanism | fine-grained reactivity — a token touches one text node | re-render + reconcile, with **React Compiler** memoizing what did not change |
| Result here | problem never arises | problem effectively erased: 0.7 ms per commit, list items skipped |
| Cost to the developer | none | none any more; before the compiler, manual `memo`/`useMemo` |

**Vue still wins by default** — it gets this from its model, not from a build step, and
there is no version of Vue where you had to hand-annotate it. That should be said plainly.

But the measurement also showed the framing was wrong on both sides: **React work was 5 ms
of a 48 ms interaction.** 83 % was the browser re-flowing a long text block — a cost Vue
would have paid identically, because it is layout, not reactivity.

> Arguing about reactivity models while the real cost is in layout is how you optimise the
> wrong thing for a week.

### What React can express that Vue cannot

Because rendering is a function **React** calls, React can defer, interrupt, and
prioritise it:

```
streaming + typing:
  composer update   → urgent
  message list      → can wait, can be interrupted
```

Vue has no way to say this. By the time `.value =` returns, the update has happened;
there is nothing left to schedule. React created the problem and, in solving it, gained a
vocabulary Vue does not have.

The same applies to **Server Components**: a per-component server/client split with no
equivalent in the Vue ecosystem, where Nuxt's boundary is the page.

---

## If asked "so which is better"

Neither answer is "React". The comparison itself is the answer:

> Vue tracks what changed and updates only that; React re-renders and reconciles. For
> frequent small updates **Vue is faster by default** — I built a streaming UI in both and
> the problem simply does not arise there. What React bought with that cost is the ability
> to say *this update is urgent and that one is not*, which Vue cannot express because the
> update is already done by the time you'd schedule it. And on this project the interesting
> part was that neither model was the bottleneck: React accounted for 5 ms of a 48 ms
> interaction, and 83 % was browser layout.

Concede where Vue wins, name what React uniquely offers, and back both with a number.
